import { eq, and, desc, sql } from 'drizzle-orm'
import { db, users, generations, sourceImages, type User, type Generation, type NewUser, type NewGeneration } from './index'

// User operations
export const userOperations = {
  // Create a new user
  async create(user: NewUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning()
    return newUser
  },

  // Find user by ID
  async findById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id))
    return user
  },

  // Find user by email
  async findByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email))
    return user
  },

  // Update user
  async update(id: string, data: Partial<NewUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning()
    return updatedUser
  },

  // Delete user
  async delete(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning()
    return result.length > 0
  }
}

// Generation operations
export const generationOperations = {
  // Create a new generation
  async create(generation: NewGeneration): Promise<Generation> {
    const [newGeneration] = await db.insert(generations).values(generation).returning()
    return newGeneration
  },

  // Find generation by ID
  async findById(id: string): Promise<Generation | undefined> {
    const [generation] = await db.select().from(generations).where(eq(generations.id, id))
    return generation
  },

  // Find generations by user ID
  async findByUserId(userId: string, limit = 50): Promise<Generation[]> {
    return db
      .select()
      .from(generations)
      .where(eq(generations.userId, userId))
      .orderBy(desc(generations.createdAt))
      .limit(limit)
  },

  // Find user's favorited source images (with their generations)
  async findFavoritedByUserId(userId: string): Promise<Generation[]> {
    return db
      .select({
        id: generations.id,
        sourceImageId: generations.sourceImageId,
        userId: generations.userId,
        projectId: generations.projectId,
        stagedImagePath: generations.stagedImagePath,
        variationIndex: generations.variationIndex,
        roomType: generations.roomType,
        stagingStyle: generations.stagingStyle,
        operationType: generations.operationType,
        status: generations.status,
        jobId: generations.jobId,
        errorMessage: generations.errorMessage,
        processingTimeMs: generations.processingTimeMs,
        createdAt: generations.createdAt,
        completedAt: generations.completedAt
      })
      .from(generations)
      .innerJoin(sourceImages, eq(generations.sourceImageId, sourceImages.id))
      .where(and(eq(generations.userId, userId), eq(sourceImages.isFavorited, true)))
      .orderBy(desc(generations.createdAt))
  },

  // Update generation
  async update(id: string, data: Partial<NewGeneration>): Promise<Generation | undefined> {
    const [updatedGeneration] = await db
      .update(generations)
      .set(data)
      .where(eq(generations.id, id))
      .returning()
    return updatedGeneration
  },

  // Update generation status
  async updateStatus(id: string, status: 'pending' | 'processing' | 'completed' | 'failed', errorMessage?: string, completedAt?: Date): Promise<Generation | undefined> {
    const updateData: Partial<NewGeneration> = { status }
    if (errorMessage) updateData.errorMessage = errorMessage
    if (completedAt) updateData.completedAt = completedAt
    
    const [updatedGeneration] = await db
      .update(generations)
      .set(updateData)
      .where(eq(generations.id, id))
      .returning()
    return updatedGeneration
  },

  // Toggle favorite on source image (via generation ID)
  async toggleFavorite(generationId: string): Promise<Generation | undefined> {
    const [generation] = await db
      .select({
        id: generations.id,
        sourceImageId: generations.sourceImageId
      })
      .from(generations)
      .where(eq(generations.id, generationId))
    
    if (!generation || !generation.sourceImageId) return undefined

    // Get current favorite status of source image
    const [sourceImage] = await db
      .select({ isFavorited: sourceImages.isFavorited })
      .from(sourceImages)
      .where(eq(sourceImages.id, generation.sourceImageId))
    
    if (!sourceImage) return undefined

    // Toggle favorite on source image
    await db
      .update(sourceImages)
      .set({ isFavorited: !sourceImage.isFavorited })
      .where(eq(sourceImages.id, generation.sourceImageId))

    // Return the generation with updated info
    const [updatedGeneration] = await db
      .select()
      .from(generations)
      .where(eq(generations.id, generationId))
    
    return updatedGeneration
  },

  // Delete generation
  async delete(id: string): Promise<boolean> {
    const result = await db.delete(generations).where(eq(generations.id, id)).returning()
    return result.length > 0
  },

  // Get generation statistics for a user
  async getUserStats(userId: string) {
    const result = await db
      .select({
        total: sql<number>`count(*)::int`,
        completed: sql<number>`count(case when status = 'completed' then 1 end)::int`,
        failed: sql<number>`count(case when status = 'failed' then 1 end)::int`,
        favorited: sql<number>`count(case when is_favorited = true then 1 end)::int`,
        avgProcessingTime: sql<number>`avg(processing_time_ms)::int`
      })
      .from(generations)
      .where(eq(generations.userId, userId))
    
    return result[0] || {
      total: 0,
      completed: 0,
      failed: 0,
      favorited: 0,
      avgProcessingTime: null
    }
  }
}

// Transaction utilities
export async function withTransaction<T>(callback: (tx: typeof db) => Promise<T>): Promise<T> {
  // Note: postgres.js handles transactions differently
  // For now, we'll use the regular db object
  // In production, consider implementing proper transaction support
  return callback(db)
}