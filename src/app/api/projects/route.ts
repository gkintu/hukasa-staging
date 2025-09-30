import { NextRequest, NextResponse } from 'next/server'
import { validateApiSession } from '@/lib/auth-utils'
import { db } from '@/db'
import { projects, sourceImages, generations } from '@/db/schema'
import { eq, sql, desc } from 'drizzle-orm'
import { valkey, CacheKeys } from '@/lib/cache/valkey-service'

export async function GET(request: NextRequest) {
  try {
    const session = await validateApiSession(request)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 })
    }

    const userId = session.user.id

    // Cache-first pattern: Try cache, fallback to database
    const sortedProjects = await valkey.getOrSet(
      CacheKeys.userProjects(userId),
      async () => {
        // Database fallback - fetch and process data
        const userProjects = await db
          .select({
            id: projects.id,
            name: projects.name,
            createdAt: projects.createdAt,
            updatedAt: projects.updatedAt,
            sourceImageCount: sql<number>`count(distinct ${sourceImages.id})::int`,
            stagedVersionCount: sql<number>`count(distinct ${generations.id})::int`
          })
          .from(projects)
          .leftJoin(sourceImages, eq(projects.id, sourceImages.projectId))
          .leftJoin(generations, eq(sourceImages.id, generations.sourceImageId))
          .where(eq(projects.userId, userId))
          .groupBy(projects.id, projects.name, projects.createdAt, projects.updatedAt)
          .orderBy(desc(projects.updatedAt))

        // Sort to ensure "Unassigned Images" project always appears first
        return userProjects.sort((a, b) => {
          const isAUnassigned = a.name === '📥 Unassigned Images'
          const isBUnassigned = b.name === '📥 Unassigned Images'

          if (isAUnassigned && !isBUnassigned) return -1
          if (!isAUnassigned && isBUnassigned) return 1
          return 0 // Maintains existing updatedAt DESC order for other projects
        })
      }
    )

    return NextResponse.json({ success: true, projects: sortedProjects })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await validateApiSession(request)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ success: false, message: 'Project name is required' }, { status: 400 })
    }

    const userId = session.user.id
    const projectName = name.trim()

    // Create new project
    const newProject = await db.insert(projects).values({
      userId,
      name: projectName,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning()

    if (newProject.length === 0) {
      return NextResponse.json({ success: false, message: 'Failed to create project' }, { status: 500 })
    }

    // Invalidate projects cache (new project added)
    await valkey.del(CacheKeys.userProjects(userId))

    return NextResponse.json({
      success: true,
      project: newProject[0],
      message: 'Project created successfully'
    })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}