import { db } from '@/db'
import { systemSettings } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export async function GET() {
  try {
    // Fetch announcement-related settings from database
    const announcementSettings = await db
      .select()
      .from(systemSettings)
      .where(
        and(
          eq(systemSettings.settingType, 'notification'),
          eq(systemSettings.isPublic, true)
        )
      )

    // Convert settings array to object for easier access
    const settings = announcementSettings.reduce((acc, setting) => {
      acc[setting.key] = setting.value
      return acc
    }, {} as Record<string, string>)

    // Check if announcement is active
    const isActive = settings['announcement_active'] === 'true'

    if (!isActive || !settings['announcement_message']) {
      return Response.json({
        success: true,
        message: 'No active announcement',
        data: null
      })
    }

    // Build announcement data
    const announcementData = {
      id: settings['announcement_id'] || 'default',
      message: settings['announcement_message'],
      type: settings['announcement_type'] || 'info',
      isActive: true,
      icon: settings['announcement_icon']
    }

    return Response.json({
      success: true,
      message: 'Announcement retrieved successfully',
      data: announcementData
    })
  } catch (error) {
    console.error('Error fetching announcement:', error)
    return Response.json(
      { success: false, message: 'Failed to fetch announcement' },
      { status: 500 }
    )
  }
}