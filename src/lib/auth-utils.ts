import { auth } from "@/lib/auth"
import { NextRequest } from "next/server"
import { suspendedUsersCache } from "./suspended-users-cache"

/**
 * Validates session for API routes
 * @param request - The NextRequest object
 * @returns Object with success status and session data
 */
export async function validateApiSession(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: request.headers
        })

        if (!session?.user?.id) {
            return { success: false, message: 'No session found' }
        }

        // Initialize cache if needed (first time)
        await suspendedUsersCache.initialize()

        // Check in-memory cache for suspended users (lightning fast!)
        if (suspendedUsersCache.isSuspended(session.user.id)) {
            console.log(`Suspended user ${session.user.id} attempted API access`)
            return { success: false, message: 'User suspended' }
        }

        return { success: true, session, user: session.user }
    } catch (error) {
        console.error("API session validation error:", error)
        return { success: false, message: 'Session validation failed' }
    }
}

/**
 * Validates session using headers object (for server components/actions)
 * @param headers - Headers object from next/headers
 * @returns Object with success status and session data
 */
export async function validateServerSession(headers: Headers) {
    try {
        const session = await auth.api.getSession({
            headers
        })

        if (!session?.user?.id) {
            return { success: false, message: 'No session found' }
        }

        // Initialize cache if needed (first time)
        await suspendedUsersCache.initialize()

        // Check in-memory cache for suspended users (lightning fast!)
        if (suspendedUsersCache.isSuspended(session.user.id)) {
            console.log(`Suspended user ${session.user.id} attempted server access`)
            return { success: false, message: 'User suspended', suspended: true }
        }

        return { success: true, session, user: session.user }
    } catch (error) {
        console.error("Server session validation error:", error)
        return { success: false, message: 'Session validation failed' }
    }
}

/**
 * Middleware wrapper for API routes requiring authentication
 * @param handler - The API route handler
 * @returns Wrapped handler with session validation
 */
export function withAuth<T extends unknown[], R>(
    handler: (request: NextRequest, session: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>, ...args: T) => Promise<R>
) {
    return async (request: NextRequest, ...args: T): Promise<R | Response> => {
        const result = await validateApiSession(request)

        if (!result.success) {
            return new Response(
                JSON.stringify({
                    error: "Unauthorized",
                    reason: result.message
                }),
                {
                    status: 401,
                    headers: { "Content-Type": "application/json" }
                }
            )
        }

        return handler(request, result.session!, ...args)
    }
}