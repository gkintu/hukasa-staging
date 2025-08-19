import { NextRequest, NextResponse } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Use getSessionCookie for Edge Runtime compatibility
    // This provides optimistic session checking for middleware
    const sessionCookie = getSessionCookie(request)

    // Redirect authenticated users away from auth pages
    if (sessionCookie && ["/login", "/signup"].includes(pathname)) {
        return NextResponse.redirect(new URL("/dashboard", request.url))
    }

    // Redirect unauthenticated users to login
    if (!sessionCookie && pathname.startsWith("/dashboard")) {
        const loginUrl = new URL("/login", request.url)
        loginUrl.searchParams.set("callbackUrl", pathname)
        return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
}

export const config = {
    matcher: ["/dashboard/:path*", "/login", "/signup"]
}