import { NextRequest, NextResponse } from 'next/server'
import { validateApiSession } from '@/lib/auth-utils'
import { db } from '@/db'
import { projects, generations } from '@/db/schema'
import { eq, sql, desc } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const session = await validateApiSession(request)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 })
    }

    const userId = session.user.id

    // Get all projects with their generation counts and thumbnail
    const userProjects = await db
      .select({
        id: projects.id,
        name: projects.name,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        imageCount: sql<number>`count(${generations.id})::int`,
        thumbnailUrl: sql<string>`min(${generations.originalImagePath})`
      })
      .from(projects)
      .leftJoin(generations, eq(projects.id, generations.projectId))
      .where(eq(projects.userId, userId))
      .groupBy(projects.id, projects.name, projects.createdAt, projects.updatedAt)
      .orderBy(desc(projects.updatedAt))

    return NextResponse.json({ success: true, projects: userProjects })
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