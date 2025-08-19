/**
 * File Service Utility Functions
 * 
 * Provides utilities for file ID encoding/decoding, directory management,
 * and secure file handling across different storage providers.
 */

import { join, dirname, basename, extname } from 'node:path'
import { promises as fs } from 'node:fs'
import { nanoid } from 'nanoid'
import { UserId, SupportedFileType } from './types'

/**
 * File ID encoding/decoding utilities
 * Creates secure, opaque file identifiers for client use
 */
class FileIdEncoder {
  /**
   * Encode user ID and relative path into secure file ID
   * Format: base64(userId:relativePath)
   */
  static encode(userId: UserId, relativePath: string): string {
    const payload = `${userId}:${relativePath}`
    return Buffer.from(payload, 'utf8').toString('base64url')
  }

  /**
   * Decode file ID back to user ID and relative path
   */
  static decode(fileId: string): { userId: UserId; relativePath: string } | null {
    try {
      const decoded = Buffer.from(fileId, 'base64url').toString('utf8')
      const [userId, ...pathParts] = decoded.split(':')
      
      if (!userId || pathParts.length === 0) {
        return null
      }

      const relativePath = pathParts.join(':')
      return { 
        userId: userId as UserId, 
        relativePath 
      }
    } catch {
      return null
    }
  }
}

/**
 * Directory management utilities
 */
class DirectoryManager {
  /**
   * Ensure directory exists, create if missing
   */
  static async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error
      }
    }
  }

  /**
   * Get user-specific directory path
   */
  static getUserDirectory(basePath: string, userId: UserId): string {
    return join(basePath, userId)
  }

  /**
   * Clean up empty directories
   */
  static async cleanupEmptyDirectories(dirPath: string): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath)
      if (entries.length === 0) {
        await fs.rmdir(dirPath)
        // Recursively clean parent if it becomes empty
        const parent = dirname(dirPath)
        if (parent !== dirPath) {
          await this.cleanupEmptyDirectories(parent)
        }
      }
    } catch {
      // Directory doesn't exist or has files, ignore
    }
  }
}

/**
 * File naming utilities
 */
class FileNaming {
  /**
   * Generate secure filename with extension
   */
  static generateSecureFilename(originalName?: string): string {
    const id = nanoid()
    if (originalName) {
      const ext = extname(originalName).toLowerCase()
      return `${id}${ext}`
    }
    return id
  }

  /**
   * Sanitize filename for security
   */
  static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace unsafe chars
      .replace(/^\.+/, '') // Remove leading dots
      .replace(/\.+$/, '') // Remove trailing dots
      .substring(0, 255) // Limit length
  }

  /**
   * Get file extension from MIME type
   */
  static getExtensionFromMimeType(mimeType: string): string {
    const mimeMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
    }
    return mimeMap[mimeType.toLowerCase()] || ''
  }

  /**
   * Generate staged filename from original
   */
  static generateStagedFilename(originalFilename: string): string {
    const ext = extname(originalFilename)
    const base = basename(originalFilename, ext)
    const stagedId = nanoid(8)
    return `staged_${base}_${stagedId}${ext}`
  }
}

/**
 * File type detection utilities
 */
class FileTypeDetector {
  /**
   * Check if file type is supported
   */
  static isSupportedType(mimeType: string): boolean {
    const supportedTypes = [
      SupportedFileType.JPEG,
      SupportedFileType.PNG,
      SupportedFileType.WEBP,
    ]
    return supportedTypes.includes(mimeType as SupportedFileType)
  }

  /**
   * Get MIME type from file extension
   */
  static getMimeTypeFromExtension(extension: string): string {
    const extMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    }
    return extMap[extension.toLowerCase()] || 'application/octet-stream'
  }

  /**
   * Validate file signature (magic bytes)
   */
  static validateFileSignature(buffer: Buffer, mimeType: string): boolean {
    const signatures: Record<string, number[][]> = {
      'image/jpeg': [[0xFF, 0xD8, 0xFF]],
      'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
      'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header
    }

    const fileSignatures = signatures[mimeType.toLowerCase()]
    if (!fileSignatures) {
      return false
    }

    return fileSignatures.some(signature => {
      if (buffer.length < signature.length) {
        return false
      }
      return signature.every((byte, index) => buffer[index] === byte)
    })
  }
}

/**
 * Path resolution utilities
 */
class PathResolver {
  /**
   * Resolve relative path to absolute path safely
   */
  static resolveSecurePath(basePath: string, relativePath: string): string {
    const resolved = join(basePath, relativePath)
    
    // Ensure resolved path is within base path (prevent directory traversal)
    const normalizedBase = join(basePath, '/')
    const normalizedResolved = join(resolved, '/')
    
    if (!normalizedResolved.startsWith(normalizedBase)) {
      throw new Error('Invalid path: outside base directory')
    }
    
    return resolved
  }

  /**
   * Check if file exists at path
   */
  static async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  /**
   * Find file with multiple possible extensions
   */
  static async findFileWithExtensions(
    basePath: string, 
    filename: string, 
    extensions: string[]
  ): Promise<string | null> {
    for (const ext of extensions) {
      const filePath = join(basePath, `${filename}${ext}`)
      if (await this.exists(filePath)) {
        return filePath
      }
    }
    return null
  }
}

/**
 * File metadata utilities
 */
class FileMetadataUtils {
  /**
   * Get file size in human readable format
   */
  static formatFileSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 B'
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    const size = bytes / Math.pow(1024, i)
    
    return `${size.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`
  }

  /**
   * Extract image dimensions from buffer
   */
  static async getImageDimensions(buffer: Buffer): Promise<{ width: number; height: number } | null> {
    try {
      // Simple PNG dimensions extraction
      if (buffer.length >= 24 && 
          buffer[0] === 0x89 && buffer[1] === 0x50 && 
          buffer[2] === 0x4E && buffer[3] === 0x47) {
        const width = buffer.readUInt32BE(16)
        const height = buffer.readUInt32BE(20)
        return { width, height }
      }
      
      // Simple JPEG dimensions extraction would be more complex
      // For now, return null - Sharp will handle this in the image processor
      return null
    } catch {
      return null
    }
  }

  /**
   * Generate file hash for deduplication
   */
  static async generateFileHash(buffer: Buffer): Promise<string> {
    const crypto = await import('node:crypto')
    return crypto.createHash('sha256').update(buffer).digest('hex').substring(0, 16)
  }
}

/**
 * Storage cleanup utilities
 */
class StorageCleanup {
  /**
   * Clean up orphaned files (files not in database)
   */
  static async cleanupOrphanedFiles(
    storagePath: string, 
    activeFilePaths: string[]
  ): Promise<string[]> {
    const deletedFiles: string[] = []
    const activeSet = new Set(activeFilePaths)

    const cleanup = async (dirPath: string): Promise<void> => {
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true })
        
        for (const entry of entries) {
          const fullPath = join(dirPath, entry.name)
          
          if (entry.isDirectory()) {
            await cleanup(fullPath)
          } else {
            const relativePath = fullPath.replace(storagePath, '').replace(/^\//, '')
            
            if (!activeSet.has(relativePath)) {
              await fs.unlink(fullPath)
              deletedFiles.push(relativePath)
            }
          }
        }
        
        // Clean up empty directories
        await DirectoryManager.cleanupEmptyDirectories(dirPath)
      } catch (error) {
        console.warn(`Cleanup error for ${dirPath}:`, error)
      }
    }

    await cleanup(storagePath)
    return deletedFiles
  }

  /**
   * Get storage usage statistics
   */
  static async getStorageStats(basePath: string): Promise<{
    totalFiles: number
    totalSize: number
    byExtension: Record<string, { count: number; size: number }>
  }> {
    const stats = {
      totalFiles: 0,
      totalSize: 0,
      byExtension: {} as Record<string, { count: number; size: number }>
    }

    const traverse = async (dirPath: string): Promise<void> => {
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true })
        
        for (const entry of entries) {
          const fullPath = join(dirPath, entry.name)
          
          if (entry.isDirectory()) {
            await traverse(fullPath)
          } else {
            const fileStat = await fs.stat(fullPath)
            const ext = extname(entry.name).toLowerCase() || 'no-ext'
            
            stats.totalFiles++
            stats.totalSize += fileStat.size
            
            if (!stats.byExtension[ext]) {
              stats.byExtension[ext] = { count: 0, size: 0 }
            }
            stats.byExtension[ext].count++
            stats.byExtension[ext].size += fileStat.size
          }
        }
      } catch (error) {
        console.warn(`Stats error for ${dirPath}:`, error)
      }
    }

    await traverse(basePath)
    return stats
  }
}

/**
 * Convenience functions for common operations
 */
export const fileUtils = {
  encodeFileId: FileIdEncoder.encode,
  decodeFileId: FileIdEncoder.decode,
  ensureDir: DirectoryManager.ensureDirectory,
  sanitizeFilename: FileNaming.sanitizeFilename,
  generateFilename: FileNaming.generateSecureFilename,
  isSupportedType: FileTypeDetector.isSupportedType,
  formatSize: FileMetadataUtils.formatFileSize,
  pathExists: PathResolver.exists,
}

export {
  FileIdEncoder,
  DirectoryManager,
  FileNaming,
  FileTypeDetector,
  PathResolver,
  FileMetadataUtils,
  StorageCleanup,
}