import { db } from '@/db'
import { projects } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { UNASSIGNED_PROJECT_NAME } from './constants/project-constants'

// Re-export for server-side convenience
export { UNASSIGNED_PROJECT_NAME }

/**
 * Gets or creates the special "Unassigned Images" project for a user.
 * This project serves as a catch-all for uploads without a specific project destination.
 * 
 * @param userId - The user ID
 * @returns Promise<string> - The project ID of the unassigned images project
 */
export async function getOrCreateUnassignedProject(userId: string): Promise<string> {
  try {
    // First, try to find existing unassigned project
    const existingProject = await db
      .select()
      .from(projects)
      .where(and(
        eq(projects.userId, userId),
        eq(projects.name, UNASSIGNED_PROJECT_NAME)
      ))
      .limit(1)

    if (existingProject.length > 0) {
      return existingProject[0].id
    }

    // Create the unassigned project if it doesn't exist
    const newProject = await db
      .insert(projects)
      .values({
        userId,
        name: UNASSIGNED_PROJECT_NAME,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning()

    if (newProject.length === 0) {
      throw new Error('Failed to create unassigned images project')
    }

    return newProject[0].id
  } catch (error) {
    console.error('Error getting/creating unassigned project:', error)
    throw error
  }
}

/**
 * Checks if a project is the special "Unassigned Images" project
 * 
 * @param projectName - The project name to check
 * @returns boolean - True if this is the unassigned project
 */
export function isUnassignedProject(projectName: string): boolean {
  return projectName === UNASSIGNED_PROJECT_NAME
}

/**
 * Checks if a project ID belongs to the unassigned project for a user
 * 
 * @param projectId - The project ID to check
 * @param userId - The user ID
 * @returns Promise<boolean> - True if this is the user's unassigned project
 */
export async function isUnassignedProjectId(projectId: string, userId: string): Promise<boolean> {
  try {
    const project = await db
      .select({ name: projects.name })
      .from(projects)
      .where(and(
        eq(projects.id, projectId),
        eq(projects.userId, userId)
      ))
      .limit(1)

    return project.length > 0 && isUnassignedProject(project[0].name)
  } catch (error) {
    console.error('Error checking if project is unassigned:', error)
    return false
  }
}