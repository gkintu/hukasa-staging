"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2 } from "lucide-react"

// Generic loading spinner
export function LoadingSpinner({ 
  size = "md", 
  text = "Loading..." 
}: { 
  size?: "sm" | "md" | "lg"
  text?: string 
}) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  }

  return (
    <div className="flex items-center justify-center p-8">
      <div className="flex items-center space-x-2">
        <Loader2 className={`${sizeClasses[size]} animate-spin`} />
        <span className="text-muted-foreground">{text}</span>
      </div>
    </div>
  )
}

// Dashboard loading skeleton
export function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-32" />
      </div>
      
      {/* Stats cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4" />
              </div>
              <Skeleton className="h-8 w-16 mt-2" />
              <Skeleton className="h-3 w-24 mt-1" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart skeleton */}
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

// Project grid loading skeleton
export function ProjectGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(count)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <Skeleton className="aspect-video rounded mb-4" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Image grid loading skeleton
export function ImageGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(count)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-0">
              <Skeleton className="aspect-video rounded-t-lg" />
              <div className="p-4">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2 mb-2" />
                <div className="flex gap-1">
                  <Skeleton className="h-6 w-12" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Table loading skeleton
export function TableSkeleton({ 
  rows = 10, 
  columns = 4 
}: { 
  rows?: number
  columns?: number 
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-24" />
      </div>
      
      <Card>
        <CardContent className="p-0">
          {/* Table header */}
          <div className="flex items-center p-4 border-b">
            {[...Array(columns)].map((_, i) => (
              <div key={i} className="flex-1 px-2">
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
          
          {/* Table rows */}
          {[...Array(rows)].map((_, rowIndex) => (
            <div key={rowIndex} className="flex items-center p-4 border-b last:border-b-0">
              {[...Array(columns)].map((_, colIndex) => (
                <div key={colIndex} className="flex-1 px-2">
                  <Skeleton className={`h-4 ${colIndex === 0 ? 'w-32' : 'w-16'}`} />
                </div>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

// Form loading skeleton
export function FormSkeleton() {
  return (
    <div className="space-y-6 max-w-md">
      <div>
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-10 w-full" />
      </div>
      
      <div>
        <Skeleton className="h-6 w-24 mb-2" />
        <Skeleton className="h-10 w-full" />
      </div>
      
      <div>
        <Skeleton className="h-6 w-28 mb-2" />
        <Skeleton className="h-24 w-full" />
      </div>
      
      <div className="flex gap-2">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-16" />
      </div>
    </div>
  )
}

// Suspense wrapper components
export function SuspenseWrapper({ 
  children, 
  fallback 
}: { 
  children: React.ReactNode
  fallback?: React.ReactNode 
}) {
  return (
    <React.Suspense fallback={fallback || <LoadingSpinner />}>
      {children}
    </React.Suspense>
  )
}

export function DashboardSuspense({ children }: { children: React.ReactNode }) {
  return (
    <React.Suspense fallback={<DashboardSkeleton />}>
      {children}
    </React.Suspense>
  )
}

export function ProjectGridSuspense({ children }: { children: React.ReactNode }) {
  return (
    <React.Suspense fallback={<ProjectGridSkeleton />}>
      {children}
    </React.Suspense>
  )
}

export function ImageGridSuspense({ children }: { children: React.ReactNode }) {
  return (
    <React.Suspense fallback={<ImageGridSkeleton />}>
      {children}
    </React.Suspense>
  )
}