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
  PieChart,
  Pie,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

// Sample data - in real app this would come from API
const userGrowthData = [
  { month: 'Jan', users: 65, newUsers: 8 },
  { month: 'Feb', users: 78, newUsers: 13 },
  { month: 'Mar', users: 90, newUsers: 12 },
  { month: 'Apr', users: 102, newUsers: 12 },
  { month: 'May', users: 118, newUsers: 16 },
  { month: 'Jun', users: 134, newUsers: 16 },
]

const imageUploadData = [
  { day: 'Mon', uploads: 12, processed: 11 },
  { day: 'Tue', uploads: 19, processed: 18 },
  { day: 'Wed', uploads: 15, processed: 13 },
  { day: 'Thu', uploads: 22, processed: 20 },
  { day: 'Fri', uploads: 28, processed: 25 },
  { day: 'Sat', uploads: 8, processed: 8 },
  { day: 'Sun', uploads: 6, processed: 6 },
]



const processingTimeData = [
  { hour: '00', avgTime: 2.3, maxTime: 4.5 },
  { hour: '04', avgTime: 1.8, maxTime: 3.2 },
  { hour: '08', avgTime: 3.5, maxTime: 6.8 },
  { hour: '12', avgTime: 4.2, maxTime: 8.1 },
  { hour: '16', avgTime: 3.8, maxTime: 7.2 },
  { hour: '20', avgTime: 2.9, maxTime: 5.4 },
]

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
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Growth</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={userGrowthConfig} className="h-[350px]">
          <AreaChart data={userGrowthData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Area
              dataKey="users"
              type="monotone"
              fill="var(--color-users)"
              stroke="var(--color-users)"
              stackId="1"
              fillOpacity={0.6}
            />
            <Area
              dataKey="newUsers"
              type="monotone"
              fill="var(--color-newUsers)"
              stroke="var(--color-newUsers)"
              stackId="1"
              fillOpacity={0.8}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export function ImageUploadChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Image Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={imageUploadConfig} className="h-[350px]">
          <BarChart data={imageUploadData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="uploads" fill="var(--color-uploads)" radius={[2, 2, 0, 0]} />
            <Bar dataKey="processed" fill="var(--color-processed)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export function ActivityDistributionChart() {
  // Map activity data to chart config keys
  const chartData = [
    { name: 'User Logins', value: 45, fill: 'var(--color-userLogins)' },
    { name: 'Image Uploads', value: 30, fill: 'var(--color-imageUploads)' },
    { name: 'Admin Actions', value: 15, fill: 'var(--color-adminActions)' },
    { name: 'System Events', value: 10, fill: 'var(--color-systemEvents)' },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={activityConfig} className="h-[350px]">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
              outerRadius={80}
              dataKey="value"
            />
            <ChartTooltip content={<ChartTooltipContent />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export function ProcessingTimeChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Processing Time Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={processingTimeConfig} className="h-[300px]">
          <LineChart data={processingTimeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Line
              type="monotone"
              dataKey="avgTime"
              stroke="var(--color-avgTime)"
              strokeWidth={3}
              dot={{ fill: "var(--color-avgTime)", r: 4 }}
              activeDot={{ r: 6, fill: "var(--color-avgTime)" }}
            />
            <Line
              type="monotone"
              dataKey="maxTime"
              stroke="var(--color-maxTime)"
              strokeWidth={3}
              strokeDasharray="8 4"
              dot={{ fill: "var(--color-maxTime)", r: 4 }}
              activeDot={{ r: 6, fill: "var(--color-maxTime)" }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}