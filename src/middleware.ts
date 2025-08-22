import { NextRequest, NextResponse } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Use getSessionCookie for Edge Runtime compatibility
    // This provides optimistic session checking for middleware
    const sessionCookie = getSessionCookie(request)

    // Redirect authenticated users away from auth pages
    if (sessionCookie && ["/login", "/signup"].includes(pathname)) {
        return NextResponse.redirect(new URL("/", request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ["/login", "/signup"]
}