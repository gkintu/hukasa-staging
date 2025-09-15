/**
 * File Service Configuration Management
 * 
 * Handles environment-based configuration for file service operations.
 * Supports both local and cloud storage configurations with type safety.
 */

import { 
  FileServiceConfig,
  FileStorageProvider,
  SupportedFileType,
  LocalStorageConfig,
  S3StorageConfig,
  ImageProcessingConfig
} from './types'
import { FileServiceErrorFactory, FileServiceErrorCode } from './errors'

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: [
    SupportedFileType.JPEG,
    SupportedFileType.PNG,
    SupportedFileType.WEBP
  ] as const,
  IMAGE_QUALITY: {
    jpeg: 85,
    webp: 80,
    png: 9 // Compression level for PNG (0-9)
  },
  MAX_DIMENSIONS: {
    width: 4096,
    height: 4096
  },
  LOCAL_UPLOAD_PATH: './uploads',
  LOCAL_PUBLIC_PATH: '/uploads'
} as const

/**
 * Environment variable keys
 */
export const ENV_KEYS = {
  // File service configuration
  FILE_SERVICE_PROVIDER: 'FILE_SERVICE_PROVIDER',
  FILE_MAX_SIZE: 'FILE_MAX_SIZE',
  FILE_UPLOAD_PATH: 'FILE_UPLOAD_PATH',
  FILE_PUBLIC_PATH: 'FILE_PUBLIC_PATH',
  
  // S3 configuration (for future use)
  AWS_S3_BUCKET: 'AWS_S3_BUCKET',
  AWS_S3_REGION: 'AWS_S3_REGION',
  AWS_ACCESS_KEY_ID: 'AWS_ACCESS_KEY_ID',
  AWS_SECRET_ACCESS_KEY: 'AWS_SECRET_ACCESS_KEY',
  AWS_S3_PUBLIC_URL_BASE: 'AWS_S3_PUBLIC_URL_BASE',
  
  // Image processing configuration
  IMAGE_JPEG_QUALITY: 'IMAGE_JPEG_QUALITY',
  IMAGE_WEBP_QUALITY: 'IMAGE_WEBP_QUALITY',
  IMAGE_PNG_QUALITY: 'IMAGE_PNG_QUALITY',
  IMAGE_MAX_WIDTH: 'IMAGE_MAX_WIDTH',
  IMAGE_MAX_HEIGHT: 'IMAGE_MAX_HEIGHT',
  IMAGE_PRESERVE_METADATA: 'IMAGE_PRESERVE_METADATA'
} as const

/**
 * Configuration builder class
 */
export class FileServiceConfigBuilder {
  private configData: {
    provider?: FileStorageProvider
    maxFileSize?: number
    allowedTypes?: readonly SupportedFileType[]
    storageConfig?: LocalStorageConfig | S3StorageConfig
    imageProcessing?: ImageProcessingConfig
  } = {}

  /**
   * Set the storage provider
   */
  provider(provider: FileStorageProvider): this {
    this.configData.provider = provider
    return this
  }

  /**
   * Set maximum file size in bytes
   */
  maxFileSize(size: number): this {
    this.configData.maxFileSize = size
    return this
  }

  /**
   * Set allowed file types
   */
  allowedTypes(types: readonly SupportedFileType[]): this {
    this.configData.allowedTypes = types
    return this
  }

  /**
   * Set local storage configuration
   */
  localStorage(config: Omit<LocalStorageConfig, 'type'>): this {
    this.configData.storageConfig = {
      type: 'local',
      ...config
    }
    return this
  }

  /**
   * Set S3 storage configuration
   */
  s3Storage(config: Omit<S3StorageConfig, 'type'>): this {
    this.configData.storageConfig = {
      type: 's3',
      ...config
    }
    return this
  }

  /**
   * Set image processing configuration
   */
  imageProcessing(config: ImageProcessingConfig): this {
    this.configData.imageProcessing = config
    return this
  }

  /**
   * Build the complete configuration
   */
  build(): FileServiceConfig {
    if (!this.configData.provider) {
      throw FileServiceErrorFactory.createSystemError(
        FileServiceErrorCode.CONFIGURATION_ERROR,
        'Storage provider is required'
      )
    }

    if (!this.configData.storageConfig) {
      throw FileServiceErrorFactory.createSystemError(
        FileServiceErrorCode.CONFIGURATION_ERROR,
        'Storage configuration is required'
      )
    }

    return {
      provider: this.configData.provider,
      maxFileSize: this.configData.maxFileSize ?? DEFAULT_CONFIG.MAX_FILE_SIZE,
      allowedTypes: this.configData.allowedTypes ?? DEFAULT_CONFIG.ALLOWED_TYPES,
      storageConfig: this.configData.storageConfig,
      imageProcessing: this.configData.imageProcessing ?? this.getDefaultImageProcessingConfig()
    }
  }

  private getDefaultImageProcessingConfig(): ImageProcessingConfig {
    return {
      quality: DEFAULT_CONFIG.IMAGE_QUALITY,
      maxDimensions: DEFAULT_CONFIG.MAX_DIMENSIONS,
      enableOptimization: true,
      preserveMetadata: false
    }
  }
}

/**
 * Environment-based configuration loader
 */
export class EnvironmentConfigLoader {
  /**
   * Load configuration from environment variables
   */
  static loadFromEnvironment(): FileServiceConfig {
    const provider = this.getProvider()
    const builder = new FileServiceConfigBuilder()
      .provider(provider)
      .maxFileSize(this.getMaxFileSize())
      .allowedTypes(DEFAULT_CONFIG.ALLOWED_TYPES)
      .imageProcessing(this.getImageProcessingConfig())

    // Configure storage based on provider
    switch (provider) {
      case FileStorageProvider.LOCAL:
        builder.localStorage(this.getLocalStorageConfig())
        break
      case FileStorageProvider.S3:
        builder.s3Storage(this.getS3StorageConfig())
        break
      default:
        throw FileServiceErrorFactory.createSystemError(
          FileServiceErrorCode.CONFIGURATION_ERROR,
          `Unsupported storage provider: ${provider}`
        )
    }

    return builder.build()
  }

  private static getProvider(): FileStorageProvider {
    const provider = process.env[ENV_KEYS.FILE_SERVICE_PROVIDER]?.toLowerCase()
    
    switch (provider) {
      case 'local':
        return FileStorageProvider.LOCAL
      case 's3':
        return FileStorageProvider.S3
      case 'memory':
        return FileStorageProvider.MEMORY
      default:
        // Default to local for development
        return FileStorageProvider.LOCAL
    }
  }

  private static getMaxFileSize(): number {
    const envSize = process.env[ENV_KEYS.FILE_MAX_SIZE]
    if (!envSize) return DEFAULT_CONFIG.MAX_FILE_SIZE

    const size = parseInt(envSize, 10)
    if (isNaN(size) || size <= 0) {
      throw FileServiceErrorFactory.createSystemError(
        FileServiceErrorCode.CONFIGURATION_ERROR,
        `Invalid file size configuration: ${envSize}`
      )
    }

    return size
  }

  private static getLocalStorageConfig(): Omit<LocalStorageConfig, 'type'> {
    return {
      uploadPath: process.env[ENV_KEYS.FILE_UPLOAD_PATH] ?? DEFAULT_CONFIG.LOCAL_UPLOAD_PATH,
      publicPath: process.env[ENV_KEYS.FILE_PUBLIC_PATH] ?? DEFAULT_CONFIG.LOCAL_PUBLIC_PATH,
      createDirectories: true
    }
  }

  private static getS3StorageConfig(): Omit<S3StorageConfig, 'type'> {
    const bucket = process.env[ENV_KEYS.AWS_S3_BUCKET]
    const region = process.env[ENV_KEYS.AWS_S3_REGION]
    const accessKeyId = process.env[ENV_KEYS.AWS_ACCESS_KEY_ID]
    const secretAccessKey = process.env[ENV_KEYS.AWS_SECRET_ACCESS_KEY]

    if (!bucket || !region || !accessKeyId || !secretAccessKey) {
      throw FileServiceErrorFactory.createSystemError(
        FileServiceErrorCode.CONFIGURATION_ERROR,
        'S3 configuration incomplete. Required: bucket, region, accessKeyId, secretAccessKey'
      )
    }

    return {
      bucket,
      region,
      accessKeyId,
      secretAccessKey,
      publicUrlBase: process.env[ENV_KEYS.AWS_S3_PUBLIC_URL_BASE]
    }
  }

  private static getImageProcessingConfig(): ImageProcessingConfig {
    return {
      quality: {
        jpeg: this.getIntEnvVar(ENV_KEYS.IMAGE_JPEG_QUALITY, DEFAULT_CONFIG.IMAGE_QUALITY.jpeg),
        webp: this.getIntEnvVar(ENV_KEYS.IMAGE_WEBP_QUALITY, DEFAULT_CONFIG.IMAGE_QUALITY.webp),
        png: this.getIntEnvVar(ENV_KEYS.IMAGE_PNG_QUALITY, DEFAULT_CONFIG.IMAGE_QUALITY.png)
      },
      maxDimensions: {
        width: this.getIntEnvVar(ENV_KEYS.IMAGE_MAX_WIDTH, DEFAULT_CONFIG.MAX_DIMENSIONS.width),
        height: this.getIntEnvVar(ENV_KEYS.IMAGE_MAX_HEIGHT, DEFAULT_CONFIG.MAX_DIMENSIONS.height)
      },
      enableOptimization: true,
      preserveMetadata: process.env[ENV_KEYS.IMAGE_PRESERVE_METADATA] === 'true'
    }
  }

  private static getIntEnvVar(key: string, defaultValue: number): number {
    const value = process.env[key]
    if (!value) return defaultValue

    const parsed = parseInt(value, 10)
    if (isNaN(parsed)) {
      throw FileServiceErrorFactory.createSystemError(
        FileServiceErrorCode.CONFIGURATION_ERROR,
        `Invalid integer value for ${key}: ${value}`
      )
    }

    return parsed
  }
}

/**
 * Configuration validation utilities
 */
export class ConfigValidator {
  /**
   * Validate a complete file service configuration
   */
  static validate(config: FileServiceConfig): void {
    this.validateBasicConfig(config)
    this.validateStorageConfig(config.storageConfig)
    this.validateImageProcessingConfig(config.imageProcessing)
  }

  private static validateBasicConfig(config: FileServiceConfig): void {
    if (config.maxFileSize <= 0) {
      throw FileServiceErrorFactory.createSystemError(
        FileServiceErrorCode.CONFIGURATION_ERROR,
        'Maximum file size must be greater than 0'
      )
    }

    if (config.allowedTypes.length === 0) {
      throw FileServiceErrorFactory.createSystemError(
        FileServiceErrorCode.CONFIGURATION_ERROR,
        'At least one file type must be allowed'
      )
    }
  }

  private static validateStorageConfig(config: LocalStorageConfig | S3StorageConfig): void {
    if (config.type === 'local') {
      if (!config.uploadPath || !config.publicPath) {
        throw FileServiceErrorFactory.createSystemError(
          FileServiceErrorCode.CONFIGURATION_ERROR,
          'Local storage requires uploadPath and publicPath'
        )
      }
    } else if (config.type === 's3') {
      if (!config.bucket || !config.region || !config.accessKeyId || !config.secretAccessKey) {
        throw FileServiceErrorFactory.createSystemError(
          FileServiceErrorCode.CONFIGURATION_ERROR,
          'S3 storage requires bucket, region, accessKeyId, and secretAccessKey'
        )
      }
    }
  }

  private static validateImageProcessingConfig(config: ImageProcessingConfig): void {
    const { jpeg, webp, png } = config.quality

    if (jpeg < 1 || jpeg > 100) {
      throw FileServiceErrorFactory.createSystemError(
        FileServiceErrorCode.CONFIGURATION_ERROR,
        'JPEG quality must be between 1-100'
      )
    }

    if (webp < 1 || webp > 100) {
      throw FileServiceErrorFactory.createSystemError(
        FileServiceErrorCode.CONFIGURATION_ERROR,
        'WebP quality must be between 1-100'
      )
    }

    if (png < 0 || png > 9) {
      throw FileServiceErrorFactory.createSystemError(
        FileServiceErrorCode.CONFIGURATION_ERROR,
        'PNG compression level must be between 0-9'
      )
    }

    if (config.maxDimensions && (config.maxDimensions.width <= 0 || config.maxDimensions.height <= 0)) {
      throw FileServiceErrorFactory.createSystemError(
        FileServiceErrorCode.CONFIGURATION_ERROR,
        'Image max dimensions must be greater than 0'
      )
    }
  }
}

/**
 * Singleton configuration manager
 */
export class FileServiceConfigManager {
  private static instance: FileServiceConfigManager
  private config: FileServiceConfig | null = null

  private constructor() {}

  static getInstance(): FileServiceConfigManager {
    if (!FileServiceConfigManager.instance) {
      FileServiceConfigManager.instance = new FileServiceConfigManager()
    }
    return FileServiceConfigManager.instance
  }

  /**
   * Get the current configuration, loading from environment if not cached
   */
  getConfig(): FileServiceConfig {
    if (!this.config) {
      this.config = EnvironmentConfigLoader.loadFromEnvironment()
      ConfigValidator.validate(this.config)
    }
    return this.config
  }

  /**
   * Set a custom configuration (useful for testing)
   */
  setConfig(config: FileServiceConfig): void {
    ConfigValidator.validate(config)
    this.config = config
  }

  /**
   * Clear cached configuration (forces reload on next access)
   */
  clearConfig(): void {
    this.config = null
  }
}