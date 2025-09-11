import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { verifySignedUrl } from '@/lib/signed-urls'
import { db } from '@/db'
import { sourceImages } from '@/db/schema'
import { sql } from 'drizzle-orm'

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30 // Per IP per minute
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function getRateLimitKey(request: NextRequest): string {
  // Use x-forwarded-for for proxied requests (like Cloudflare)
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         request.headers.get('x-real-ip') || 
         'unknown'
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const resetTime = Math.floor(now / RATE_LIMIT_WINDOW) * RATE_LIMIT_WINDOW + RATE_LIMIT_WINDOW
  
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, resetTime })
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 }
  }
  
  const entry = rateLimitMap.get(ip)!
  
  // Reset counter if window has passed
  if (now >= entry.resetTime) {
    entry.count = 1
    entry.resetTime = resetTime
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 }
  }
  
  // Check if over limit
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0 }
  }
  
  // Increment counter
  entry.count++
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - entry.count }
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now >= entry.resetTime + RATE_LIMIT_WINDOW) {
      rateLimitMap.delete(ip)
    }
  }
}, 5 * 60 * 1000) // Clean up every 5 minutes

function getMimeTypeFromExtension(extension: string): string {
  switch (extension.toLowerCase()) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.webp':
      return 'image/webp'
    case '.gif':
      return 'image/gif'
    default:
      return 'application/octet-stream'
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params
    const url = new URL(request.url)
    
    // Rate limiting check
    const clientIp = getRateLimitKey(request)
    const rateLimit = checkRateLimit(clientIp)
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil((Date.now() + RATE_LIMIT_WINDOW) / 1000).toString(),
            'Retry-After': Math.ceil(RATE_LIMIT_WINDOW / 1000).toString()
          }
        }
      )
    }
    
    // Extract signature and expiry from query params
    const expires = url.searchParams.get('expires')
    const signature = url.searchParams.get('signature')
    
    if (!expires || !signature) {
      return NextResponse.json(
        { error: 'Missing signature or expiry' },
        { 
          status: 400,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString()
          }
        }
      )
    }
    
    // Verify the signed URL
    const verification = verifySignedUrl(fileId, expires, signature)
    
    if (!verification.valid) {
      const statusCode = verification.expired ? 410 : 403 // 410 Gone for expired, 403 Forbidden for invalid signature
      const errorMessage = verification.expired ? 'URL has expired' : 'Invalid signature'
      
      return NextResponse.json(
        { error: errorMessage },
        { 
          status: statusCode,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString()
          }
        }
      )
    }
    
    // File discovery logic for new hierarchical structure
    const uploadPath = process.env.FILE_UPLOAD_PATH
    if (!uploadPath) {
      throw new Error('FILE_UPLOAD_PATH environment variable is required')
    }
    const extensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
    let filePath: string | null = null
    let actualExtension = ''
    
    // First, try to find the source image in database by looking for the fileId in the filePath
    try {
      const sourceImageRecords = await db.select()
        .from(sourceImages)
        .where(sql`${sourceImages.originalImagePath} LIKE ${'%' + fileId + '%'}`)
        .limit(10) // Limit to prevent excessive results
      
      for (const record of sourceImageRecords) {
        const userId = record.userId
        const sourceImageId = record.id
        
        // Try new structure: {userId}/{sourceImageId}/source.ext
        for (const ext of extensions) {
          const sourcePath = join(uploadPath, userId, sourceImageId, `source${ext}`)
          try {
            await fs.access(sourcePath)
            filePath = sourcePath
            actualExtension = ext
            break
          } catch {
            // File doesn't exist with this extension, try next
          }
        }
        
        if (filePath) break
      }
    } catch (dbError) {
      console.warn('Database lookup failed, falling back to file system search:', dbError)
    }
    
    // If database lookup failed or didn't find the file, fall back to searching the file system
    if (!filePath) {
      const uploadDir = await fs.readdir(uploadPath, { withFileTypes: true })
      const userDirs = uploadDir.filter(dirent => dirent.isDirectory()).map(dirent => dirent.name)
      
      for (const userDirName of userDirs) {
        const userPath = join(uploadPath, userDirName)
        try {
          const userContents = await fs.readdir(userPath, { withFileTypes: true })
          const sourceImageDirs = userContents.filter(dirent => dirent.isDirectory()).map(dirent => dirent.name)
          
          for (const sourceImageId of sourceImageDirs) {
            const sourceImageDir = join(userPath, sourceImageId)
            
            for (const ext of extensions) {
              // Try new structure: {userId}/{sourceImageId}/source.ext
              const sourcePath = join(sourceImageDir, `source${ext}`)
              try {
                await fs.access(sourcePath)
                filePath = sourcePath
                actualExtension = ext
                break
              } catch {
                // File doesn't exist with this extension, try next
              }
              
              // Also search in generations subdirectory of this source image
              try {
                const generationsDir = join(sourceImageDir, 'generations')
                const genFiles = await fs.readdir(generationsDir)
                const matchingFile = genFiles.find(file => file.includes(fileId) && file.endsWith(ext))
                if (matchingFile) {
                  filePath = join(generationsDir, matchingFile)
                  actualExtension = ext
                  break
                }
              } catch {
                // Generations directory doesn't exist or is empty
              }
            }
            
            if (filePath) break
          }
        } catch {
          // User directory doesn't exist or can't be read
        }
        
        if (filePath) break
      }
    }
    
    if (!filePath) {
      return NextResponse.json(
        { error: 'File not found' },
        { 
          status: 404,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString()
          }
        }
      )
    }
    
    // Serve the file
    const fileBuffer = await fs.readFile(filePath)
    const stats = await fs.stat(filePath)
    
    // Security headers for public endpoint
    const headers = {
      'Content-Type': getMimeTypeFromExtension(actualExtension),
      'Content-Length': stats.size.toString(),
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour (same as URL expiry)
      'ETag': `"${fileId}"`,
      'Last-Modified': stats.mtime.toUTCString(),
      // Security headers
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      // Rate limit headers
      'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
      'X-RateLimit-Remaining': rateLimit.remaining.toString(),
      // CORS for external AI services
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS'
    }
    
    console.log(`📁 Signed URL file served: ${fileId} (${stats.size} bytes, IP: ${clientIp})`)
    
    return new NextResponse(new Uint8Array(fileBuffer), { headers })
    
  } catch (error) {
    console.error('Temporary file serving error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// OPTIONS handler for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  })
}