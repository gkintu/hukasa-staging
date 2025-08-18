import { NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
    // Check for Better Auth session cookie instead of database query
    const sessionCookie = 
        request.cookies.get("better-auth.session_token") ||
        request.cookies.get("better-auth.session_token.localhost")

    if (!sessionCookie) {
        const loginUrl = new URL("/login", request.url)
        loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname)
        return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
}

export const config = {
    matcher: ["/dashboard/:path*"]
}