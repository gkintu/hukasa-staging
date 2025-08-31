import { NextRequest } from 'next/server'
import { db } from '@/db/index'
import { users, adminActions } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { validateApiSession } from '@/lib/auth-utils'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate admin session
    const session = await validateApiSession(request)
    if (!session) {
      return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const adminUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id)
    })

    if (!adminUser || adminUser.role !== 'admin') {
      return Response.json({ success: false, message: 'Admin access required' }, { status: 403 })
    }

    const { id: userId } = await params
    const { suspend, reason } = await request.json()

    // Get target user
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId)
    })

    if (!targetUser) {
      return Response.json({ success: false, message: 'User not found' }, { status: 404 })
    }

    // Prevent admin from suspending themselves
    if (userId === session.user.id) {
      return Response.json({ 
        success: false, 
        message: 'Cannot suspend your own account' 
      }, { status: 400 })
    }

    // Prevent suspending other admins (only owners could do this in a more complex system)
    if (targetUser.role === 'admin') {
      return Response.json({ 
        success: false, 
        message: 'Cannot suspend admin users' 
      }, { status: 403 })
    }

    // Update user suspension status
    await db
      .update(users)
      .set({ 
        suspended: suspend,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))

    // Log admin action
    await db.insert(adminActions).values({
      action: suspend ? 'SUSPEND_USER' : 'UNSUSPEND_USER',
      adminId: session.user.id,
      targetUserId: userId,
      targetResourceType: 'user',
      targetResourceId: userId,
      targetResourceName: targetUser.name || targetUser.email,
      reason: reason || undefined,
      metadata: JSON.stringify({ 
        previousSuspendedState: targetUser.suspended,
        newSuspendedState: suspend
      }),
      ipAddress: request.headers.get('x-forwarded-for') || 
                  request.headers.get('x-real-ip') || 
                  'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      createdAt: new Date()
    })

    return Response.json({
      success: true,
      message: suspend ? 'User suspended successfully' : 'User unsuspended successfully',
      data: {
        userId,
        suspended: suspend
      }
    })

  } catch (error) {
    console.error('Admin user suspension error:', error)
    return Response.json({ 
      success: false, 
      message: 'Failed to update user suspension status' 
    }, { status: 500 })
  }
}