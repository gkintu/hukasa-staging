import { NextRequest, NextResponse } from 'next/server'
import { validateAdminSession } from '@/lib/admin-auth'
import { valkey, CacheKeys } from '@/lib/cache/valkey-service'
import { auditLogger } from '@/lib/audit-logger'
import { nanoid } from 'nanoid'
import { z } from 'zod'

const createAnnouncementSchema = z.object({
  message: z.string().min(1).max(500),
  type: z.enum(['info', 'success', 'warning', 'error']),
  startDate: z.string().optional(), // ISO date string
  endDate: z.string().optional() // ISO date string
})

/**
 * GET /api/admin/announcements
 *
 * Get current active announcement (admin view).
 */
export async function GET(request: NextRequest) {
  try {
    const adminContext = await validateAdminSession(request)
    if (!adminContext) {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      )
    }

    // Get active announcement ID
    const activeAnnouncementId = await valkey.get<string>(
      CacheKeys.systemAnnouncementActive()
    )

    if (!activeAnnouncementId) {
      return NextResponse.json({
        success: true,
        message: 'No active announcement',
        data: null
      })
    }

    // Get announcement data
    const announcement = await valkey.get<{
      id: string
      message: string
      type: 'info' | 'success' | 'warning' | 'error'
      startDate?: number
      endDate?: number
      createdAt: number
      createdBy: string
    }>(CacheKeys.systemAnnouncement(activeAnnouncementId))

    if (!announcement) {
      // Clean up orphaned pointer
      await valkey.del(CacheKeys.systemAnnouncementActive())
      return NextResponse.json({
        success: true,
        message: 'No active announcement',
        data: null
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Announcement retrieved successfully',
      data: announcement
    })
  } catch (error) {
    console.error('Error fetching announcement:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch announcement' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/announcements
 *
 * Create or update system announcement.
 * Admin-only endpoint.
 *
 * Pipeline:
 * 1. Validate admin session
 * 2. Generate unique announcement ID
 * 3. Write to KV store
 * 4. Set as active announcement
 * 5. Publish to SSE for live delivery
 */
export async function POST(request: NextRequest) {
  try {
    const adminContext = await validateAdminSession(request)
    if (!adminContext) {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = createAnnouncementSchema.parse(body)

    // Generate unique announcement ID
    const announcementId = nanoid(10)

    // Build announcement data
    const announcementData = {
      id: announcementId,
      message: validatedData.message.trim(),
      type: validatedData.type,
      startDate: validatedData.startDate ? new Date(validatedData.startDate).getTime() : undefined,
      endDate: validatedData.endDate ? new Date(validatedData.endDate).getTime() : undefined,
      createdAt: Date.now(),
      createdBy: adminContext.adminId
    }

    // Write to KV store
    await valkey.set(
      CacheKeys.systemAnnouncement(announcementId),
      announcementData
    )

    // Set as active announcement
    await valkey.set(CacheKeys.systemAnnouncementActive(), announcementId)

    // Publish to SSE (Valkey Pub/Sub)
    try {
      await valkey.publish('announcement:changed', JSON.stringify({
        type: 'ANNOUNCEMENT_CREATED',
        data: announcementData
      }))
      console.log('📢 Published announcement to SSE:', announcementId)
    } catch (publishError) {
      console.warn('⚠️ Failed to publish announcement to SSE:', publishError)
      // Don't fail the request if pub/sub fails
    }

    // Log the announcement creation
    await auditLogger.log({
      action: 'update_settings',
      adminId: adminContext.adminId,
      adminEmail: adminContext.adminEmail,
      details: {
        type: 'announcement_created',
        announcementId,
        message: validatedData.message,
        announcementType: validatedData.type
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Announcement created successfully',
      data: announcementData
    })
  } catch (error) {
    console.error('Error creating announcement:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid announcement data',
          error: error.issues
        },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, message: 'Failed to create announcement' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/announcements
 *
 * Remove active announcement.
 * Admin-only endpoint.
 *
 * Pipeline:
 * 1. Validate admin session
 * 2. Get active announcement ID
 * 3. Delete announcement data
 * 4. Delete active pointer
 * 5. Publish removal to SSE
 */
export async function DELETE(request: NextRequest) {
  try {
    const adminContext = await validateAdminSession(request)
    if (!adminContext) {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      )
    }

    // Get active announcement ID
    const activeAnnouncementId = await valkey.get<string>(
      CacheKeys.systemAnnouncementActive()
    )

    if (!activeAnnouncementId) {
      return NextResponse.json({
        success: true,
        message: 'No active announcement to delete'
      })
    }

    // Delete announcement data
    await valkey.del(CacheKeys.systemAnnouncement(activeAnnouncementId))

    // Delete active pointer
    await valkey.del(CacheKeys.systemAnnouncementActive())

    // Publish removal to SSE
    try {
      await valkey.publish('announcement:changed', JSON.stringify({
        type: 'ANNOUNCEMENT_REMOVED',
        data: { id: activeAnnouncementId }
      }))
      console.log('📢 Published announcement removal to SSE:', activeAnnouncementId)
    } catch (publishError) {
      console.warn('⚠️ Failed to publish announcement removal to SSE:', publishError)
    }

    // Log the announcement deletion
    await auditLogger.log({
      action: 'update_settings',
      adminId: adminContext.adminId,
      adminEmail: adminContext.adminEmail,
      details: {
        type: 'announcement_deleted',
        announcementId: activeAnnouncementId
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Announcement deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting announcement:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete announcement' },
      { status: 500 }
    )
  }
}
