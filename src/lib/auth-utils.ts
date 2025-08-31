import { auth } from "@/lib/auth"
import { NextRequest } from "next/server"
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"

/**
 * Validates session for API routes
 * @param request - The NextRequest object
 * @returns Session object if valid, null if invalid
 */
export async function validateApiSession(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: request.headers
        })
        
        if (!session?.user?.id) return null
        
        // Check if user is suspended
        const user = await db.query.users.findFirst({
            where: eq(users.id, session.user.id),
            columns: { suspended: true }
        })
        
        if (user?.suspended) {
            console.log(`Suspended user ${session.user.id} attempted API access`)
            return null
        }
        
        return session
    } catch (error) {
        console.error("API session validation error:", error)
        return null
    }
}

/**
 * Validates session using headers object (for server components/actions)
 * @param headers - Headers object from next/headers
 * @returns Session object if valid, null if invalid, 'suspended' if user is suspended
 */
export async function validateServerSession(headers: Headers) {
    try {
        const session = await auth.api.getSession({
            headers
        })
        
        if (!session?.user?.id) return null
        
        // Check if user is suspended
        const user = await db.query.users.findFirst({
            where: eq(users.id, session.user.id),
            columns: { suspended: true }
        })
        
        if (user?.suspended) {
            console.log(`Suspended user ${session.user.id} attempted server access`)
            return 'suspended' as const
        }
        
        return session
    } catch (error) {
        console.error("Server session validation error:", error)
        return null
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
        const session = await validateApiSession(request)
        
        if (!session) {
            return new Response(
                JSON.stringify({ 
                    error: "Unauthorized", 
                    reason: "Account suspended or invalid session" 
                }), 
                { 
                    status: 401,
                    headers: { "Content-Type": "application/json" }
                }
            )
        }

        return handler(request, session, ...args)
    }
}