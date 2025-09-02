/**
 * Admin Authentication and Authorization Utilities
 * 
 * Handles admin role checking and middleware for protected admin routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateApiSession } from '@/lib/auth-utils'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Admin context information
 */
export interface AdminContext {
  isAdmin: boolean
  adminId: string
  adminEmail: string
  adminName: string
}

/**
 * Validate admin session for API routes
 */
export async function validateAdminSession(request: NextRequest): Promise<AdminContext | null> {
  try {
    // First validate regular session
    const session = await validateApiSession(request)
    if (!session?.user?.id) {
      return null
    }

    // Check if user has admin role
    const user = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1)

    if (user.length === 0 || user[0].role !== 'admin') {
      return null
    }

    return {
      isAdmin: true,
      adminId: user[0].id,
      adminEmail: user[0].email,
      adminName: user[0].name
    }
  } catch (error) {
    console.error('Admin session validation error:', error)
    return null
  }
}

/**
 * Check if a user has admin role (for client-side components)
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const user = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    return user.length > 0 && user[0].role === 'admin'
  } catch (error) {
    console.error('Admin role check error:', error)
    return false
  }
}

/**
 * Admin route protection middleware
 */
export function withAdminAuth(handler: (request: NextRequest, adminContext: AdminContext) => Promise<Response>) {
  return async (request: NextRequest): Promise<Response> => {
    const adminContext = await validateAdminSession(request)
    
    if (!adminContext) {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      )
    }

    return handler(request, adminContext)
  }
}

/**
 * Get user role for display purposes
 */
export async function getUserRole(userId: string): Promise<'user' | 'admin' | null> {
  try {
    const user = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    return user.length > 0 ? user[0].role : null
  } catch (error) {
    console.error('Get user role error:', error)
    return null
  }
}

/**
 * Admin permissions check for different operations
 */
export const AdminPermissions = {
  // Can view user data
  VIEW_USERS: 'view_users',
  // Can delete user content
  DELETE_USER_CONTENT: 'delete_user_content',
  // Can suspend users
  SUSPEND_USERS: 'suspend_users',
  // Can view audit logs
  VIEW_AUDIT_LOGS: 'view_audit_logs'
} as const

export type AdminPermission = typeof AdminPermissions[keyof typeof AdminPermissions]

/**
 * Check if admin has specific permission
 * For now, all admins have all permissions, but this allows for future role-based permissions
 */
export function hasAdminPermission(adminContext: AdminContext): boolean {
  // All admins currently have all permissions
  return adminContext.isAdmin
}