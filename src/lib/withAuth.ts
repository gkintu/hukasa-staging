/**
 * Authentication middleware for Next.js 15 API routes
 * 
 * Provides a simple HOF pattern to authenticate API requests without circular imports.
 * Based on Better Auth integration patterns found in Next.js 15 projects.
 */

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

export interface AuthenticatedUser {
  id: string
  email: string
  name: string
  image?: string
}

export type AuthenticatedHandler = (
  request: NextRequest,
  user: AuthenticatedUser
) => Promise<NextResponse> | NextResponse

/**
 * Higher-order function that wraps API route handlers with authentication
 * 
 * @param handler - The API route handler to protect
 * @returns Protected API route handler
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async function authenticatedRoute(request: NextRequest): Promise<NextResponse> {
    try {
      // Get session using Better Auth
      const session = await auth.api.getSession({
        headers: await headers()
      })

      // Check if user is authenticated
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Create user object for handler
      const user: AuthenticatedUser = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image || undefined
      }

      // Call the protected handler
      return await handler(request, user)

    } catch (error) {
      console.error('Authentication error:', error)
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 500 }
      )
    }
  }
}

/**
 * Optional: Get current user without wrapping a handler
 * Useful for server components and actions
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    })

    if (!session?.user?.id) {
      return null
    }

    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image || undefined
    }
  } catch (error) {
    console.error('Failed to get current user:', error)
    return null
  }
}