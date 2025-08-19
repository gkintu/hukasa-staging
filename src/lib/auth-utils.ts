import { auth } from "@/lib/auth"
import { NextRequest } from "next/server"

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
        return session
    } catch (error) {
        console.error("API session validation error:", error)
        return null
    }
}

/**
 * Validates session using headers object (for server components/actions)
 * @param headers - Headers object from next/headers
 * @returns Session object if valid, null if invalid
 */
export async function validateServerSession(headers: Headers) {
    try {
        const session = await auth.api.getSession({
            headers
        })
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
                JSON.stringify({ error: "Unauthorized" }), 
                { 
                    status: 401,
                    headers: { "Content-Type": "application/json" }
                }
            )
        }

        return handler(request, session, ...args)
    }
}