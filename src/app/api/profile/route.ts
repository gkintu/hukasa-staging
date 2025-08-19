import { NextRequest } from "next/server"
import { withAuth } from "@/lib/auth-utils"

// Example protected API route using session validation
async function handler(request: NextRequest, session: NonNullable<Awaited<ReturnType<typeof import("@/lib/auth").auth.api.getSession>>>) {
    return Response.json({
        user: {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            image: session.user.image
        },
        session: {
            id: session.session.id,
            expiresAt: session.session.expiresAt
        }
    })
}

export const GET = withAuth(handler)