/**
 * Admin Audit Logging System
 * 
 * Tracks all admin actions for compliance and security monitoring
 */

import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Admin action types for audit logging
 */
export const AdminActions = {
  // User management
  VIEW_USER: 'view_user',
  SEARCH_USERS: 'search_users',
  
  // Image management
  DELETE_USER_IMAGE: 'delete_user_image',
  BATCH_DELETE_IMAGES: 'batch_delete_images',
  VIEW_ALL_IMAGES: 'view_all_images',
  
  // System actions
  ACCESS_ADMIN_DASHBOARD: 'access_admin_dashboard',
  VIEW_AUDIT_LOGS: 'view_audit_logs'
} as const

export type AdminAction = typeof AdminActions[keyof typeof AdminActions]

/**
 * Audit log entry interface
 */
export interface AuditLogEntry {
  action: AdminAction
  adminId: string
  adminEmail: string
  targetUserId?: string
  targetResourceId?: string
  details?: Record<string, unknown>
  timestamp: Date
  ipAddress?: string
  userAgent?: string
}

/**
 * In-memory audit log store (for now)
 * In production, this would be stored in a database table
 */
class AuditLogger {
  private logs: AuditLogEntry[] = []
  private maxLogs = 10000 // Keep last 10k logs in memory

  /**
   * Log an admin action
   */
  async log(entry: Omit<AuditLogEntry, 'timestamp'>): Promise<void> {
    const logEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date()
    }

    // Add to in-memory store
    this.logs.unshift(logEntry)
    
    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs)
    }

    // Log to console for development
    console.log('🔒 Admin Action:', {
      action: logEntry.action,
      admin: logEntry.adminEmail,
      target: logEntry.targetUserId || logEntry.targetResourceId,
      timestamp: logEntry.timestamp.toISOString()
    })

    // TODO: In production, also store in database table
    // await this.persistToDatabase(logEntry)
  }

  /**
   * Get audit logs with filtering
   */
  getLogs(filters?: {
    adminId?: string
    action?: AdminAction
    targetUserId?: string
    since?: Date
    limit?: number
  }): AuditLogEntry[] {
    let filteredLogs = [...this.logs]

    if (filters?.adminId) {
      filteredLogs = filteredLogs.filter(log => log.adminId === filters.adminId)
    }

    if (filters?.action) {
      filteredLogs = filteredLogs.filter(log => log.action === filters.action)
    }

    if (filters?.targetUserId) {
      filteredLogs = filteredLogs.filter(log => log.targetUserId === filters.targetUserId)
    }

    if (filters?.since) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.since!)
    }

    const limit = filters?.limit || 100
    return filteredLogs.slice(0, limit)
  }

  /**
   * Get recent admin activity summary
   */
  getActivitySummary(): {
    totalActions: number
    uniqueAdmins: number
    recentActions: AuditLogEntry[]
    actionsByType: Record<string, number>
  } {
    const uniqueAdmins = new Set(this.logs.map(log => log.adminId)).size
    const recentActions = this.logs.slice(0, 10)
    
    const actionsByType: Record<string, number> = {}
    this.logs.forEach(log => {
      actionsByType[log.action] = (actionsByType[log.action] || 0) + 1
    })

    return {
      totalActions: this.logs.length,
      uniqueAdmins,
      recentActions,
      actionsByType
    }
  }

  /**
   * Clear all logs (for testing/development)
   */
  clearLogs(): void {
    this.logs = []
  }
}

// Singleton audit logger instance
export const auditLogger = new AuditLogger()

/**
 * Convenience function to log admin actions
 */
export async function logAdminAction(
  action: AdminAction,
  adminId: string,
  options?: {
    targetUserId?: string
    targetResourceId?: string
    details?: Record<string, unknown>
    ipAddress?: string
    userAgent?: string
  }
): Promise<void> {
  try {
    // Get admin email from database
    const admin = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, adminId))
      .limit(1)

    const adminEmail = admin.length > 0 ? admin[0].email : 'unknown@admin.com'

    await auditLogger.log({
      action,
      adminId,
      adminEmail,
      ...options
    })
  } catch (error) {
    console.error('Failed to log admin action:', error)
    // Don't throw error - audit logging shouldn't break the main flow
  }
}

/**
 * Get audit logs for display
 */
export function getAuditLogs(filters?: {
  adminId?: string
  action?: AdminAction
  targetUserId?: string
  since?: Date
  limit?: number
}): AuditLogEntry[] {
  return auditLogger.getLogs(filters)
}

/**
 * Get admin activity summary for dashboard
 */
export function getAdminActivitySummary() {
  return auditLogger.getActivitySummary()
}