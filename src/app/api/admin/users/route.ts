import { NextRequest } from 'next/server'
import { db } from '@/db/index'
import { users, projects, sourceImages } from '@/db/schema'
import { eq, sql, ilike, or, desc, count } from 'drizzle-orm'
import { validateApiSession } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    // Validate admin session
    const session = await validateApiSession(request)
    if (!session) {
      return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id)
    })

    if (!user || user.role !== 'admin') {
      return Response.json({ success: false, message: 'Admin access required' }, { status: 403 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const searchQuery = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')
    const offset = (page - 1) * pageSize

    // Build search conditions
    const searchCondition = searchQuery 
      ? or(
          ilike(users.email, `%${searchQuery}%`),
          ilike(users.name, `%${searchQuery}%`)
        )
      : undefined

    // Get users with statistics
    const usersWithStats = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        role: users.role,
        suspended: users.suspended,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        lastActiveAt: users.lastActiveAt,
        lastLoginAt: users.lastLoginAt,
        projectCount: count(projects.id),
        imageCount: count(sourceImages.id),
      })
      .from(users)
      .leftJoin(projects, eq(users.id, projects.userId))
      .leftJoin(sourceImages, eq(users.id, sourceImages.userId))
      .where(searchCondition)
      .groupBy(users.id, users.name, users.email, users.image, users.role, users.suspended, users.createdAt, users.updatedAt, users.lastActiveAt, users.lastLoginAt)
      .orderBy(desc(users.createdAt))
      .limit(pageSize)
      .offset(offset)

    // Get total count for pagination
    const totalCountResult = await db
      .select({ count: sql<number>`count(distinct ${users.id})` })
      .from(users)
      .where(searchCondition)

    const totalCount = totalCountResult[0]?.count || 0
    const totalPages = Math.ceil(totalCount / pageSize)

    return Response.json({
      success: true,
      data: {
        users: usersWithStats,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    })

  } catch (error) {
    console.error('Admin users list error:', error)
    return Response.json({ 
      success: false, 
      message: 'Failed to fetch users' 
    }, { status: 500 })
  }
}