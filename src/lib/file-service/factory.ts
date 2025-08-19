/**
 * File Service Factory Pattern Implementation
 * 
 * Provides a centralized way to create file service instances based on
 * configuration. Supports different storage providers with seamless switching.
 */

import { 
  FileService, 
  FileServiceFactory as IFileServiceFactory, 
  FileServiceConfig,
  FileStorageProvider,
  SupportedFileType
} from './types'
import { FileServiceErrorFactory, FileServiceErrorCode } from './errors'

/**
 * Registry of available file service implementations
 */
interface FileServiceConstructor {
  new (config: FileServiceConfig): FileService
}

/**
 * File service implementation registry
 */
class FileServiceRegistry {
  private static implementations = new Map<FileStorageProvider, FileServiceConstructor>()

  /**
   * Register a file service implementation
   */
  static register(provider: FileStorageProvider, implementation: FileServiceConstructor): void {
    this.implementations.set(provider, implementation)
  }

  /**
   * Get a file service implementation
   */
  static get(provider: FileStorageProvider): FileServiceConstructor | undefined {
    return this.implementations.get(provider)
  }

  /**
   * Check if a provider is supported
   */
  static isSupported(provider: FileStorageProvider): boolean {
    return this.implementations.has(provider)
  }

  /**
   * Get all supported providers
   */
  static getSupportedProviders(): FileStorageProvider[] {
    return Array.from(this.implementations.keys())
  }
}

/**
 * Main factory implementation
 */
export class FileServiceFactory implements IFileServiceFactory {
  private static instance: FileServiceFactory
  private createdServices = new Map<string, FileService>()

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): FileServiceFactory {
    if (!FileServiceFactory.instance) {
      FileServiceFactory.instance = new FileServiceFactory()
    }
    return FileServiceFactory.instance
  }

  /**
   * Create a file service instance based on configuration
   */
  createFileService(config: FileServiceConfig): FileService {
    // Create a unique key for this configuration
    const configKey = this.createConfigKey(config)

    // Return existing service if already created with the same config
    if (this.createdServices.has(configKey)) {
      return this.createdServices.get(configKey)!
    }

    // Validate configuration
    this.validateConfiguration(config)

    // Get implementation for the provider
    const Implementation = FileServiceRegistry.get(config.provider)
    if (!Implementation) {
      throw FileServiceErrorFactory.createSystemError(
        FileServiceErrorCode.CONFIGURATION_ERROR,
        `No implementation found for provider: ${config.provider}. ` +
        `Supported providers: ${FileServiceRegistry.getSupportedProviders().join(', ')}`
      )
    }

    // Create and cache the service
    try {
      const service = new Implementation(config)
      this.createdServices.set(configKey, service)
      return service
    } catch (error) {
      throw FileServiceErrorFactory.createSystemError(
        FileServiceErrorCode.SERVICE_UNAVAILABLE,
        `Failed to create file service: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Create file service with default configuration from environment
   */
  createDefaultFileService(): FileService {
    // This will be implemented once we have the config manager
    // For now, we'll create a local service with basic config
    const defaultConfig: FileServiceConfig = {
      provider: FileStorageProvider.LOCAL,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: [
        SupportedFileType.JPEG,
        SupportedFileType.PNG,
        SupportedFileType.WEBP
      ],
      storageConfig: {
        type: 'local',
        uploadPath: './uploads',
        publicPath: '/uploads',
        createDirectories: true
      },
      imageProcessing: {
        quality: { jpeg: 85, webp: 80, png: 9 },
        maxDimensions: { width: 4096, height: 4096 },
        enableOptimization: true,
        preserveMetadata: false
      }
    }

    return this.createFileService(defaultConfig)
  }

  /**
   * Register a new file service implementation
   */
  static registerImplementation(
    provider: FileStorageProvider, 
    implementation: FileServiceConstructor
  ): void {
    FileServiceRegistry.register(provider, implementation)
  }

  /**
   * Check if a provider is supported
   */
  static isProviderSupported(provider: FileStorageProvider): boolean {
    return FileServiceRegistry.isSupported(provider)
  }

  /**
   * Get list of supported providers
   */
  static getSupportedProviders(): FileStorageProvider[] {
    return FileServiceRegistry.getSupportedProviders()
  }

  /**
   * Clear all cached services (useful for testing)
   */
  clearCache(): void {
    this.createdServices.clear()
  }

  /**
   * Validate configuration before creating service
   */
  private validateConfiguration(config: FileServiceConfig): void {
    if (!config.provider) {
      throw FileServiceErrorFactory.createSystemError(
        FileServiceErrorCode.CONFIGURATION_ERROR,
        'Storage provider is required'
      )
    }

    if (config.maxFileSize <= 0) {
      throw FileServiceErrorFactory.createSystemError(
        FileServiceErrorCode.CONFIGURATION_ERROR,
        'Maximum file size must be greater than 0'
      )
    }

    if (!config.allowedTypes || config.allowedTypes.length === 0) {
      throw FileServiceErrorFactory.createSystemError(
        FileServiceErrorCode.CONFIGURATION_ERROR,
        'At least one file type must be allowed'
      )
    }

    if (!config.storageConfig) {
      throw FileServiceErrorFactory.createSystemError(
        FileServiceErrorCode.CONFIGURATION_ERROR,
        'Storage configuration is required'
      )
    }

    if (!config.imageProcessing) {
      throw FileServiceErrorFactory.createSystemError(
        FileServiceErrorCode.CONFIGURATION_ERROR,
        'Image processing configuration is required'
      )
    }
  }

  /**
   * Create a unique key for configuration caching
   */
  private createConfigKey(config: FileServiceConfig): string {
    // Create a hash-like key based on configuration
    const keyData = {
      provider: config.provider,
      maxFileSize: config.maxFileSize,
      allowedTypes: [...config.allowedTypes].sort(),
      storageConfig: config.storageConfig,
      imageProcessing: config.imageProcessing
    }

    return JSON.stringify(keyData)
  }
}

/**
 * Abstract base class for file service implementations
 * Provides common functionality and enforces interface compliance
 */
export abstract class BaseFileService implements FileService {
  protected readonly config: FileServiceConfig

  constructor(config: FileServiceConfig) {
    this.config = config
    this.validateConfiguration()
  }

  /**
   * Validate configuration specific to this implementation
   */
  protected abstract validateConfiguration(): void

  /**
   * Abstract methods that must be implemented by concrete classes
   */
  abstract uploadFile(
    file: File, 
    userId: import('./types').UserId, 
    metadata?: Partial<Pick<import('./types').FileMetadata, 'originalName'>>
  ): Promise<import('./types').FileUploadResponse>
  
  abstract deleteFile(
    fileId: import('./types').FileId, 
    userId: import('./types').UserId
  ): Promise<import('./types').FileOperationError | { success: true }>
  
  abstract getFileUrl(
    fileId: import('./types').FileId, 
    userId: import('./types').UserId
  ): Promise<import('./types').FileOperationError | { success: true; url: string }>
  
  abstract validateFile(file: File): Promise<import('./types').FileValidationResponse>
  
  abstract getFileMetadata(
    fileId: import('./types').FileId, 
    userId: import('./types').UserId
  ): Promise<import('./types').FileOperationError | { success: true; metadata: import('./types').FileMetadata }>

  /**
   * Get configuration for derived classes
   */
  protected getConfig(): FileServiceConfig {
    return this.config
  }
}

/**
 * Builder pattern for easy factory configuration
 */
export class FileServiceFactoryBuilder {
  private factory: FileServiceFactory

  constructor() {
    this.factory = FileServiceFactory.getInstance()
  }

  /**
   * Register a custom implementation
   */
  registerImplementation(
    provider: FileStorageProvider, 
    implementation: FileServiceConstructor
  ): this {
    FileServiceFactory.registerImplementation(provider, implementation)
    return this
  }

  /**
   * Build the factory
   */
  build(): FileServiceFactory {
    return this.factory
  }
}

/**
 * Convenient factory functions for common use cases
 */
export const createFileService = (config: FileServiceConfig): FileService => {
  return FileServiceFactory.getInstance().createFileService(config)
}

export const createDefaultFileService = (): FileService => {
  return FileServiceFactory.getInstance().createDefaultFileService()
}

/**
 * Development utilities
 */
export class FileServiceFactoryUtils {
  /**
   * Create a mock file service for testing
   */
  static createMockService(): FileService {
    // This would create a memory-based mock service for testing
    // Implementation would depend on having a MemoryFileService
    throw new Error('Mock service not yet implemented - use LOCAL provider for testing')
  }

  /**
   * Validate factory configuration
   */
  static validateFactorySetup(): {
    isValid: boolean
    supportedProviders: FileStorageProvider[]
    missingProviders: FileStorageProvider[]
  } {
    const allProviders = Object.values(FileStorageProvider)
    const supportedProviders = FileServiceFactory.getSupportedProviders()
    const missingProviders = allProviders.filter(p => !supportedProviders.includes(p))

    return {
      isValid: supportedProviders.length > 0,
      supportedProviders,
      missingProviders
    }
  }
}

// Export the singleton factory instance
export const fileServiceFactory = FileServiceFactory.getInstance()