import { NextRequest, NextResponse } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

export async function middleware(request: NextRequest) {
  // Only apply to admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Optimistic check - only verify session cookie exists
    // This is for performance; actual security validation happens in AdminLayout
    const sessionCookie = getSessionCookie(request)
    
    if (!sessionCookie) {
      // No session cookie found - redirect to home
      return NextResponse.redirect(new URL('/', request.url))
    }
    
    // Session cookie exists - allow through to AdminLayout for full validation
  }
  
  return NextResponse.next()
}

export const config = {
  // Apply middleware only to admin routes
  matcher: ['/admin/:path*']
}