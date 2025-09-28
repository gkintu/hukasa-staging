import { NextRequest } from 'next/server'
import { db } from '@/db'
import { systemSettings } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { validateAdminSession } from '@/lib/admin-auth'
import { auditLogger } from '@/lib/audit-logger'
import { z } from 'zod'

const updateAnnouncementSchema = z.object({
  message: z.string().min(1).max(500),
  type: z.enum(['info', 'success', 'warning', 'error']),
  isActive: z.boolean(),
  icon: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    const adminContext = await validateAdminSession(request)
    if (!adminContext) {
      return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    // Fetch current announcement settings
    const announcementSettings = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.settingType, 'notification'))

    const settings = announcementSettings.reduce((acc, setting) => {
      acc[setting.key] = setting.value
      return acc
    }, {} as Record<string, string>)

    const currentAnnouncement = {
      message: settings['announcement_message'] || '',
      type: settings['announcement_type'] || 'info',
      isActive: settings['announcement_active'] === 'true',
      icon: settings['announcement_icon'] || ''
    }

    return Response.json({
      success: true,
      message: 'Announcement settings retrieved successfully',
      data: currentAnnouncement
    })
  } catch (error) {
    console.error('Error fetching announcement settings:', error)
    return Response.json(
      { success: false, message: 'Failed to fetch announcement settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminContext = await validateAdminSession(request)
    if (!adminContext) {
      return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateAnnouncementSchema.parse(body)

    // Generate a new announcement ID when message changes or becomes active
    const announcementId = `announcement-${Date.now()}`

    // Prepare settings to upsert
    const settingsToUpdate = [
      {
        key: 'announcement_message',
        value: validatedData.message,
        description: 'The message displayed in the announcement banner',
        settingType: 'notification' as const,
        isPublic: true
      },
      {
        key: 'announcement_type',
        value: validatedData.type,
        description: 'The type/style of the announcement banner',
        settingType: 'notification' as const,
        isPublic: true
      },
      {
        key: 'announcement_active',
        value: validatedData.isActive.toString(),
        description: 'Whether the announcement banner is currently active',
        settingType: 'notification' as const,
        isPublic: true
      },
      {
        key: 'announcement_id',
        value: announcementId,
        description: 'Unique identifier for the current announcement',
        settingType: 'notification' as const,
        isPublic: true
      }
    ]

    if (validatedData.icon) {
      settingsToUpdate.push({
        key: 'announcement_icon',
        value: validatedData.icon,
        description: 'Optional icon for the announcement banner',
        settingType: 'notification' as const,
        isPublic: true
      })
    }

    // Update all settings
    const updatedSettings = []
    for (const settingData of settingsToUpdate) {
      const [updatedSetting] = await db
        .insert(systemSettings)
        .values({
          ...settingData,
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: systemSettings.key,
          set: {
            value: settingData.value,
            description: settingData.description,
            updatedAt: new Date()
          }
        })
        .returning()

      updatedSettings.push(updatedSetting)
    }

    // Log the announcement update
    await auditLogger.log({
      action: 'update_settings',
      adminId: adminContext.adminId,
      adminEmail: adminContext.adminEmail,
      details: {
        announcementUpdate: {
          message: validatedData.message,
          type: validatedData.type,
          isActive: validatedData.isActive,
          announcementId
        }
      }
    })

    return Response.json({
      success: true,
      message: 'Announcement updated successfully',
      data: validatedData
    })
  } catch (error) {
    console.error('Error updating announcement:', error)
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          success: false,
          message: 'Invalid announcement data',
          error: error.issues
        },
        { status: 400 }
      )
    }
    return Response.json(
      { success: false, message: 'Failed to update announcement' },
      { status: 500 }
    )
  }
}