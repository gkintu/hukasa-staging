/**
 * Simple Storage Test
 * 
 * Basic test of the storage path utilities and file organization
 */

import { createStoragePathManager, createSourceImageId, createGenerationId } from './src/lib/file-service/storage-paths'
import { createUserId } from './src/lib/file-service/types'

async function simpleTest() {
  console.log('🧪 Testing storage path utilities...')

  // Test path manager
  const pathManager = createStoragePathManager({
    baseUploadPath: './uploads',
    basePublicPath: '/uploads'
  })

  const userId = createUserId('test-user-123')
  const sourceImageId = createSourceImageId('84bd58cf-ee93-4e95-aa4e-fd9e49658836')

  console.log('\n📂 Testing source image paths:')
  
  const sourcePath = pathManager.getSourceImageRelativePath(userId, sourceImageId, '.jpg')
  console.log(`  Relative path: ${sourcePath}`)
  
  const sourceUrl = pathManager.getSourceImagePublicUrl(userId, sourceImageId, '.jpg')
  console.log(`  Public URL: ${sourceUrl}`)

  console.log('\n🎨 Testing generation paths:')
  
  const generationPath = pathManager.getGenerationRelativePath(
    userId, 
    sourceImageId, 
    1, 
    createGenerationId('b7658c44-5267-4392-a89d-d59843d43961'),
    '.png'
  )
  console.log(`  Generation path: ${generationPath}`)

  const generationUrl = pathManager.getGenerationPublicUrl(
    userId,
    sourceImageId,
    1,
    createGenerationId('b7658c44-5267-4392-a89d-d59843d43961'),
    '.png'
  )
  console.log(`  Generation URL: ${generationUrl}`)

  console.log('\n✅ Path validation:')
  console.log(`  Source path valid: ${pathManager.isValidHierarchicalPath(sourcePath)}`)
  console.log(`  Generation path valid: ${pathManager.isValidHierarchicalPath(generationPath)}`)

  console.log('\n🔍 Testing path parsing:')
  const parsedSource = pathManager.parseSourcePath(sourcePath)
  console.log(`  Parsed source:`, parsedSource)

  const parsedGeneration = pathManager.parseGenerationPath(generationPath)
  console.log(`  Parsed generation:`, parsedGeneration)

  console.log('\n🎉 Simple test completed successfully!')
}

if (require.main === module) {
  simpleTest().catch(console.error)
}