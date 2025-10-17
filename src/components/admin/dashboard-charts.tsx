"use client"

import * as React from "react"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/admin/ui/chart"


// Chart configurations
const userGrowthConfig = {
  users: {
    label: "Total Users",
    color: "var(--chart-1)",
  },
  newUsers: {
    label: "New Users",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

const imageUploadConfig = {
  uploads: {
    label: "Uploads",
    color: "var(--chart-1)",
  },
  processed: {
    label: "Processed",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

const activityConfig = {
  userLogins: {
    label: "User Logins",
    color: "var(--chart-1)",
  },
  imageUploads: {
    label: "Image Uploads", 
    color: "var(--chart-2)",
  },
  adminActions: {
    label: "Admin Actions",
    color: "var(--chart-3)",
  },
  systemEvents: {
    label: "System Events",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig

const processingTimeConfig = {
  avgTime: {
    label: "Average Time",
    color: "var(--chart-1)",
  },
  maxTime: {
    label: "Maximum Time",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

export function UserGrowthChart() {
  const [data, setData] = React.useState<Array<{date: string; users: number; label: string}>>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        setError(null)
        
        const response = await fetch('/api/admin/charts/user-growth')
        const result = await response.json()
        
        if (!response.ok) {
          throw new Error(result.message || 'Failed to fetch user growth data')
        }
        
        if (result.success) {
          setData(result.data)
        } else {
          throw new Error(result.message || 'Failed to fetch user growth data')
        }
      } catch (error) {
        console.error('Failed to fetch user growth data:', error)
        setError(error instanceof Error ? error.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Growth</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Failed to load user growth data</p>
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
          <CardTitle>User Growth</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading chart data...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Growth (Last 30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={userGrowthConfig} className="h-[350px]">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              dataKey="users"
              type="monotone"
              fill="var(--color-users)"
              stroke="var(--color-users)"
              fillOpacity={0.6}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export function ImageUploadChart() {
  const [data, setData] = React.useState<Array<{date: string; images: number; label: string}>>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        setError(null)
        
        const response = await fetch('/api/admin/charts/image-uploads')
        const result = await response.json()
        
        if (!response.ok) {
          throw new Error(result.message || 'Failed to fetch image upload data')
        }
        
        if (result.success) {
          setData(result.data)
        } else {
          throw new Error(result.message || 'Failed to fetch image upload data')
        }
      } catch (error) {
        console.error('Failed to fetch image upload data:', error)
        setError(error instanceof Error ? error.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Image Uploads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Failed to load image upload data</p>
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
          <CardTitle>Image Uploads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading chart data...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Image Uploads (Last 30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={imageUploadConfig} className="h-[350px]">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="images" fill="var(--color-uploads)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export function ActivityDistributionChart() {
  const [data, setData] = React.useState<Array<{hour: string; activity: number}>>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        setError(null)
        
        const response = await fetch('/api/admin/charts/activity-distribution')
        const result = await response.json()
        
        if (!response.ok) {
          throw new Error(result.message || 'Failed to fetch activity distribution data')
        }
        
        if (result.success) {
          setData(result.data)
        } else {
          throw new Error(result.message || 'Failed to fetch activity distribution data')
        }
      } catch (error) {
        console.error('Failed to fetch activity distribution data:', error)
        setError(error instanceof Error ? error.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Failed to load activity distribution data</p>
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
          <CardTitle>Activity Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading chart data...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity by Hour</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={activityConfig} className="h-[350px]">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="activity" fill="var(--color-userLogins)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export function ProcessingTimeChart() {
  const [data, setData] = React.useState<Array<{date: string; avgTime: number | null; count: number; label: string}>>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        setError(null)
        
        const response = await fetch('/api/admin/charts/processing-time')
        const result = await response.json()
        
        if (!response.ok) {
          throw new Error(result.message || 'Failed to fetch processing time data')
        }
        
        if (result.success) {
          setData(result.data)
        } else {
          throw new Error(result.message || 'Failed to fetch processing time data')
        }
      } catch (error) {
        console.error('Failed to fetch processing time data:', error)
        setError(error instanceof Error ? error.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Processing Times</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Failed to load processing time data</p>
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
          <CardTitle>Processing Times</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading chart data...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const chartData = data.filter(d => d.avgTime !== null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Processing Times (Last 30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={processingTimeConfig} className="h-[300px]">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis label={{ value: 'Seconds', angle: -90, position: 'insideLeft' }} />
            <ChartTooltip 
              content={<ChartTooltipContent />}
              formatter={(value: number) => [`${value}s`, 'Avg Time']}
            />
            <Line
              type="monotone"
              dataKey="avgTime"
              stroke="var(--color-avgTime)"
              strokeWidth={3}
              dot={{ fill: "var(--color-avgTime)", r: 4 }}
              activeDot={{ r: 6, fill: "var(--color-avgTime)" }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}