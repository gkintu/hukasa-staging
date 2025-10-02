import { NextRequest, NextResponse } from 'next/server'
import { valkey, CacheKeys } from '@/lib/cache/valkey-service'

/**
 * GET /api/announcements/current
 *
 * Fetch the currently active announcement from KV store.
 * No authentication required (public endpoint).
 *
 * Pipeline:
 * 1. Read "announcement:active" key from Valkey (contains active announcement ID)
 * 2. If exists, read "announcement:<id>" to get full announcement data
 * 3. Return announcement or null if none active
 */
export async function GET(request: NextRequest) {
  try {
    // Step 1: Get active announcement ID
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

    // Step 2: Get announcement data
    const announcement = await valkey.get<{
      id: string
      message: string
      type: 'info' | 'success' | 'warning' | 'error'
      startDate?: number
      endDate?: number
      createdAt: number
    }>(CacheKeys.systemAnnouncement(activeAnnouncementId))

    if (!announcement) {
      // Active ID exists but data missing - clean up
      await valkey.del(CacheKeys.systemAnnouncementActive())
      return NextResponse.json({
        success: true,
        message: 'No active announcement',
        data: null
      })
    }

    // Step 3: Check if announcement is within date range (optional)
    const now = Date.now()
    if (announcement.startDate && now < announcement.startDate) {
      return NextResponse.json({
        success: true,
        message: 'Announcement not yet active',
        data: null
      })
    }

    if (announcement.endDate && now > announcement.endDate) {
      // Expired - clean up
      await valkey.del(CacheKeys.systemAnnouncementActive())
      await valkey.del(CacheKeys.systemAnnouncement(activeAnnouncementId))
      return NextResponse.json({
        success: true,
        message: 'Announcement expired',
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
