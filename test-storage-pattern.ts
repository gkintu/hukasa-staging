/**
 * Test Script for New Storage Pattern
 * 
 * Verifies that the enhanced file service and hierarchical storage work correctly
 * 
 * Usage: npx tsx test-storage-pattern.ts
 */

import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { EnhancedLocalFileService } from './src/lib/file-service/enhanced-local-service'
import { 
  FileServiceConfig, 
  FileStorageProvider, 
  SupportedFileType,
  createUserId 
} from './src/lib/file-service/types'
import { createSourceImageId } from './src/lib/file-service/storage-paths'
import { createStoragePathManager } from './src/lib/file-service/storage-paths'

/**
 * Test configuration
 */
const TEST_CONFIG: FileServiceConfig = {
  provider: FileStorageProvider.LOCAL,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    SupportedFileType.JPEG,
    SupportedFileType.PNG,
    SupportedFileType.WEBP,
    SupportedFileType.HEIC,
    SupportedFileType.TIFF,
    SupportedFileType.BMP
  ],
  storageConfig: {
    type: 'local',
    uploadPath: './test-uploads',
    publicPath: '/test-uploads',
    createDirectories: true
  },
  imageProcessing: {
    quality: {
      jpeg: 85,
      webp: 80,
      png: 6
    },
    maxDimensions: {
      width: 2048,
      height: 2048
    },
    enableOptimization: true,
    preserveMetadata: false
  }
}

/**
 * Create a test image buffer (simple PNG)
 */
function createTestImageBuffer(): Buffer {
  // Simple 1x1 PNG in base64
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
  return Buffer.from(pngBase64, 'base64')
}

/**
 * Test storage path utilities
 */
async function testStoragePaths(): Promise<boolean> {
  console.log('🧪 Testing storage path utilities...')

  const pathManager = createStoragePathManager({
    baseUploadPath: './test-uploads',
    basePublicPath: '/test-uploads'
  })

  const userId = createUserId('test-user-123')
  const sourceImageId = createSourceImageId('source-abc-123')
  
  // Test path generation
  const sourcePath = pathManager.getSourceImageRelativePath(userId, sourceImageId, '.jpg')
  const expectedSourcePath = 'test-user-123/sources/source-abc-123.jpg'
  
  if (sourcePath !== expectedSourcePath) {
    console.error(`❌ Source path mismatch. Expected: ${expectedSourcePath}, Got: ${sourcePath}`)
    return false
  }

  const generationPath = pathManager.getGenerationRelativePath(
    userId, sourceImageId, 1, 'gen-xyz-789', '.png'
  )
  const expectedGenerationPath = 'test-user-123/generations/source-abc-123/variation-1-gen-xyz-789.png'
  
  if (generationPath !== expectedGenerationPath) {
    console.error(`❌ Generation path mismatch. Expected: ${expectedGenerationPath}, Got: ${generationPath}`)
    return false
  }

  // Test path validation
  if (!pathManager.isValidHierarchicalPath(sourcePath)) {
    console.error(`❌ Source path validation failed: ${sourcePath}`)
    return false
  }

  if (!pathManager.isValidHierarchicalPath(generationPath)) {
    console.error(`❌ Generation path validation failed: ${generationPath}`)
    return false
  }

  console.log('✅ Storage path utilities working correctly')
  return true
}

/**
 * Test enhanced file service
 */
async function testEnhancedFileService(): Promise<boolean> {
  console.log('🧪 Testing enhanced file service...')

  try {
    const fileService = new EnhancedLocalFileService(TEST_CONFIG)
    await fileService.initialize()

    const userId = createUserId('test-user-456')
    const sourceImageId = createSourceImageId('source-def-456')

    // Create a mock File object
    const testBuffer = createTestImageBuffer()
    const mockFile = new File([testBuffer], 'test-image.png', { type: 'image/png' })

    console.log('  📤 Testing source image upload...')
    const uploadResult = await fileService.uploadSourceImage(
      mockFile,
      userId,
      sourceImageId,
      { originalName: 'test-image.png' }
    )

    if (!uploadResult.success) {
      console.error('❌ Source image upload failed:', uploadResult.error)
      return false
    }

    console.log(`  ✅ Source image uploaded: ${uploadResult.relativePath}`)

    // Test generation storage
    console.log('  📤 Testing generation storage...')
    const generationResult = await fileService.storeGeneration({
      sourceImageId,
      userId,
      variationIndex: 1,
      imageBuffer: testBuffer,
      mimeType: SupportedFileType.PNG
    })

    if (!generationResult.success) {
      console.error('❌ Generation storage failed:', generationResult)
      return false
    }

    console.log(`  ✅ Generation stored: ${generationResult.relativePath}`)

    // Verify files exist on disk
    const sourceFilePath = join('./test-uploads', uploadResult.relativePath)
    const generationFilePath = join('./test-uploads', generationResult.relativePath)

    try {
      await fs.access(sourceFilePath)
      console.log(`  ✅ Source file exists: ${sourceFilePath}`)
    } catch {
      console.error(`❌ Source file not found: ${sourceFilePath}`)
      return false
    }

    try {
      await fs.access(generationFilePath)
      console.log(`  ✅ Generation file exists: ${generationFilePath}`)
    } catch {
      console.error(`❌ Generation file not found: ${generationFilePath}`)
      return false
    }

    console.log('✅ Enhanced file service working correctly')
    return true

  } catch (error) {
    console.error('❌ Enhanced file service test failed:', error)
    return false
  }
}

/**
 * Test different file formats
 */
async function testFileFormats(): Promise<boolean> {
  console.log('🧪 Testing different file formats...')

  const fileService = new EnhancedLocalFileService(TEST_CONFIG)
  await fileService.initialize()

  const formats = [
    { type: SupportedFileType.JPEG, extension: '.jpg', name: 'test.jpg' },
    { type: SupportedFileType.PNG, extension: '.png', name: 'test.png' },
    { type: SupportedFileType.WEBP, extension: '.webp', name: 'test.webp' },
    // Note: HEIC, TIFF, BMP would need actual file data for proper testing
  ]

  const userId = createUserId('test-user-formats')
  const testBuffer = createTestImageBuffer()

  for (const format of formats) {
    try {
      console.log(`  📤 Testing ${format.type} format...`)
      
      const sourceImageId = createSourceImageId(`source-${format.extension.slice(1)}`)
      const mockFile = new File([testBuffer], format.name, { type: format.type })

      const result = await fileService.uploadSourceImage(
        mockFile,
        userId,
        sourceImageId,
        { originalName: format.name }
      )

      if (result.success) {
        console.log(`  ✅ ${format.type} format supported`)
      } else {
        console.log(`  ⚠️  ${format.type} format upload failed:`, result.error?.message)
      }
    } catch (error) {
      console.log(`  ⚠️  ${format.type} format error:`, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  console.log('✅ File format tests completed')
  return true
}

/**
 * Cleanup test files
 */
async function cleanup(): Promise<void> {
  try {
    await fs.rm('./test-uploads', { recursive: true, force: true })
    console.log('🧹 Cleaned up test files')
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Main test function
 */
async function runTests(): Promise<void> {
  console.log('🚀 Starting storage pattern tests...\n')

  let allPassed = true

  try {
    // Test 1: Storage path utilities
    if (!await testStoragePaths()) {
      allPassed = false
    }
    
    console.log('')

    // Test 2: Enhanced file service
    if (!await testEnhancedFileService()) {
      allPassed = false
    }

    console.log('')

    // Test 3: File formats
    if (!await testFileFormats()) {
      allPassed = false
    }

    console.log('')

    // Summary
    if (allPassed) {
      console.log('🎉 All tests passed! Storage pattern is working correctly.')
    } else {
      console.log('❌ Some tests failed. Please review the errors above.')
      process.exit(1)
    }

  } catch (error) {
    console.error('💥 Test suite failed:', error)
    process.exit(1)
  } finally {
    await cleanup()
  }
}

// Run if called directly
if (require.main === module) {
  runTests()
}

export { runTests }