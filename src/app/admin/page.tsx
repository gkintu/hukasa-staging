"use client"

import * as React from "react"
import { DashboardStats } from "@/components/admin/dashboard-stats"
import { 
  UserGrowthChart, 
  ImageUploadChart, 
  ActivityDistributionChart, 
  ProcessingTimeChart 
} from "@/components/admin/dashboard-charts"
import { RecentActivity } from "@/components/admin/recent-activity"
import { AppErrorBoundary, DataErrorBoundary } from "@/components/error-boundary"
import { DashboardSuspense, SuspenseWrapper } from "@/components/loading-states"

export default function AdminDashboardPage() {
  return (
    <AppErrorBoundary>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and manage your platform with real-time insights
          </p>
        </div>
        
        {/* Stats Overview with Error Boundary */}
        <DataErrorBoundary>
          <SuspenseWrapper>
            <DashboardStats />
          </SuspenseWrapper>
        </DataErrorBoundary>

        {/* Charts Section */}
        <div className="grid gap-6 md:grid-cols-2">
          <DataErrorBoundary>
            <DashboardSuspense>
              <UserGrowthChart />
            </DashboardSuspense>
          </DataErrorBoundary>
          
          <DataErrorBoundary>
            <DashboardSuspense>
              <ImageUploadChart />
            </DashboardSuspense>
          </DataErrorBoundary>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <DataErrorBoundary>
            <DashboardSuspense>
              <ActivityDistributionChart />
            </DashboardSuspense>
          </DataErrorBoundary>
          
          <DataErrorBoundary>
            <DashboardSuspense>
              <ProcessingTimeChart />
            </DashboardSuspense>
          </DataErrorBoundary>
        </div>

        {/* Recent Activity with Error Boundary */}
        <DataErrorBoundary>
          <SuspenseWrapper>
            <RecentActivity />
          </SuspenseWrapper>
        </DataErrorBoundary>
      </div>
    </AppErrorBoundary>
  )
}