/**
 * Storage Path Utilities for Hierarchical File Organization
 * 
 * Provides utilities for managing source images and generated images
 * in a hierarchical directory structure that mirrors database relationships.
 */

import { join } from 'node:path'
import { FileId, UserId } from './types'

export type SourceImageId = string & { readonly __brand: 'SourceImageId' }
export type GenerationId = string & { readonly __brand: 'GenerationId' }

export const createSourceImageId = (id: string): SourceImageId => id as SourceImageId
export const createGenerationId = (id: string): GenerationId => id as GenerationId

/**
 * Storage path configuration
 */
export interface StoragePathConfig {
  readonly baseUploadPath: string
  readonly basePublicPath: string
}

/**
 * Path generator for hierarchical storage structure
 */
export class StoragePathManager {
  constructor(private config: StoragePathConfig) {}

  // ===== USER DIRECTORIES =====

  /**
   * Get user's base directory
   */
  getUserDirectory(userId: UserId): string {
    return join(this.config.baseUploadPath, userId)
  }

  /**
   * Get user's sources directory
   */
  getSourcesDirectory(userId: UserId): string {
    return join(this.getUserDirectory(userId), 'sources')
  }

  /**
   * Get user's generations base directory
   */
  getGenerationsBaseDirectory(userId: UserId): string {
    return join(this.getUserDirectory(userId), 'generations')
  }

  /**
   * Get generations directory for specific source image
   */
  getGenerationsDirectory(userId: UserId, sourceImageId: SourceImageId): string {
    return join(this.getGenerationsBaseDirectory(userId), sourceImageId)
  }

  // ===== SOURCE IMAGE PATHS =====

  /**
   * Generate file path for source image
   */
  getSourceImagePath(userId: UserId, sourceImageId: SourceImageId, extension: string): string {
    return join(this.getSourcesDirectory(userId), `${sourceImageId}${extension}`)
  }

  /**
   * Generate relative path for source image (for database storage)
   */
  getSourceImageRelativePath(userId: UserId, sourceImageId: SourceImageId, extension: string): string {
    return `${userId}/sources/${sourceImageId}${extension}`
  }

  /**
   * Generate public URL for source image
   */
  getSourceImagePublicUrl(userId: UserId, sourceImageId: SourceImageId, extension: string): string {
    return `${this.config.basePublicPath}/${userId}/sources/${sourceImageId}${extension}`
  }

  // ===== GENERATION PATHS =====

  /**
   * Generate file path for generation
   */
  getGenerationPath(
    userId: UserId, 
    sourceImageId: SourceImageId, 
    variationIndex: number,
    generationId: GenerationId, 
    extension: string
  ): string {
    const filename = `variation-${variationIndex}-${generationId}${extension}`
    return join(this.getGenerationsDirectory(userId, sourceImageId), filename)
  }

  /**
   * Generate relative path for generation (for database storage)
   */
  getGenerationRelativePath(
    userId: UserId,
    sourceImageId: SourceImageId,
    variationIndex: number,
    generationId: GenerationId,
    extension: string
  ): string {
    const filename = `variation-${variationIndex}-${generationId}${extension}`
    return `${userId}/generations/${sourceImageId}/${filename}`
  }

  /**
   * Generate public URL for generation
   */
  getGenerationPublicUrl(
    userId: UserId,
    sourceImageId: SourceImageId,
    variationIndex: number,
    generationId: GenerationId,
    extension: string
  ): string {
    const filename = `variation-${variationIndex}-${generationId}${extension}`
    return `${this.config.basePublicPath}/${userId}/generations/${sourceImageId}/${filename}`
  }

  // ===== MIGRATION UTILITIES =====

  /**
   * Parse legacy source image path to extract user ID and file ID
   */
  parseLegacySourcePath(legacyPath: string): { userId: UserId; fileId: string; extension: string } | null {
    const match = legacyPath.match(/^([^/]+)\/([^/]+)(\.[^.]+)$/)
    if (!match) return null

    const [, userId, fileId, extension] = match
    return {
      userId: userId as UserId,
      fileId,
      extension
    }
  }

  /**
   * Convert legacy source image path to new hierarchical path
   */
  migrateLegacySourcePath(legacyPath: string, sourceImageId: SourceImageId): string | null {
    const parsed = this.parseLegacySourcePath(legacyPath)
    if (!parsed) return null

    return this.getSourceImageRelativePath(parsed.userId, sourceImageId, parsed.extension)
  }

  /**
   * Get legacy source image file path (current structure)
   */
  getLegacySourceImagePath(userId: UserId, fileId: string, extension: string): string {
    return join(this.getUserDirectory(userId), `${fileId}${extension}`)
  }

  // ===== PATH VALIDATION =====

  /**
   * Validate that a path follows the hierarchical structure
   */
  isValidHierarchicalPath(path: string): boolean {
    // Check for source image path: {userId}/sources/{sourceImageId}.ext
    const sourcePattern = /^[^/]+\/sources\/[^/]+\.[a-zA-Z]{2,4}$/
    if (sourcePattern.test(path)) return true

    // Check for generation path: {userId}/generations/{sourceImageId}/variation-{n}-{genId}.ext
    const generationPattern = /^[^/]+\/generations\/[^/]+\/variation-\d+-[^/]+\.[a-zA-Z]{2,4}$/
    return generationPattern.test(path)
  }

  /**
   * Extract components from hierarchical generation path
   */
  parseGenerationPath(path: string): {
    userId: UserId
    sourceImageId: SourceImageId
    variationIndex: number
    generationId: GenerationId
    extension: string
  } | null {
    const match = path.match(/^([^/]+)\/generations\/([^/]+)\/variation-(\d+)-([^/]+)(\.[^.]+)$/)
    if (!match) return null

    const [, userId, sourceImageId, variationIndexStr, generationId, extension] = match
    return {
      userId: userId as UserId,
      sourceImageId: sourceImageId as SourceImageId,
      variationIndex: parseInt(variationIndexStr, 10),
      generationId: generationId as GenerationId,
      extension
    }
  }

  /**
   * Extract components from hierarchical source path
   */
  parseSourcePath(path: string): {
    userId: UserId
    sourceImageId: SourceImageId
    extension: string
  } | null {
    const match = path.match(/^([^/]+)\/sources\/([^/]+)(\.[^.]+)$/)
    if (!match) return null

    const [, userId, sourceImageId, extension] = match
    return {
      userId: userId as UserId,
      sourceImageId: sourceImageId as SourceImageId,
      extension
    }
  }
}

/**
 * Default storage path manager instance
 */
export function createStoragePathManager(config: StoragePathConfig): StoragePathManager {
  return new StoragePathManager(config)
}