/**
 * Signed URL File Serving Route Handler
 *
 * Serves files with cryptographic signature validation.
 * No database queries - pure file serving with security.
 */

import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { verifySignature, getMimeTypeFromExtension, getFileExtension } from '@/lib/signed-urls'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)

    // Extract file path from URL (remove /files/ prefix)
    const filePath = url.pathname.replace('/files/', '')

    // Extract query parameters
    const userId = url.searchParams.get('userId')
    const expires = url.searchParams.get('expires')
    const signature = url.searchParams.get('sig')

    // Validate required parameters
    if (!userId || !expires || !signature) {
      console.log('❌ Missing required parameters:', { userId: !!userId, expires: !!expires, signature: !!signature })
      return new NextResponse('Bad Request: Missing required parameters', { status: 400 })
    }

    // Verify cryptographic signature
    if (!verifySignature(filePath, userId, expires, signature)) {
      console.log('🔐 Signature verification failed for:', { filePath, userId })
      return new NextResponse('Forbidden: Invalid signature', { status: 403 })
    }

    // Build full file path
    const uploadPath = process.env.FILE_UPLOAD_PATH
    if (!uploadPath) {
      console.error('❌ FILE_UPLOAD_PATH environment variable not set')
      return new NextResponse('Server configuration error', { status: 500 })
    }

    const fullPath = path.join(uploadPath, filePath)

    // Security check: Ensure file is within upload directory (prevent path traversal)
    const resolvedPath = path.resolve(fullPath)
    const resolvedUploadPath = path.resolve(uploadPath)

    if (!resolvedPath.startsWith(resolvedUploadPath)) {
      console.log('🚨 Path traversal attempt detected:', { filePath, resolvedPath })
      return new NextResponse('Forbidden: Invalid file path', { status: 403 })
    }

    // Check if file exists
    try {
      await fs.access(fullPath)
    } catch {
      console.log('📁 File not found:', fullPath)
      return new NextResponse('File not found', { status: 404 })
    }

    // Read file and get stats
    const [fileBuffer, stats] = await Promise.all([
      fs.readFile(fullPath),
      fs.stat(fullPath)
    ])

    // Determine MIME type from file extension
    const extension = getFileExtension(filePath)
    const mimeType = getMimeTypeFromExtension(extension)

    // Set response headers for optimal caching and security
    const headers: Record<string, string> = {
      'Content-Type': mimeType,
      'Content-Length': stats.size.toString(),
      'Cache-Control': 'private, max-age=86400, immutable', // 24 hour cache
      'ETag': `"${stats.mtime.getTime()}-${stats.size}"`,
      'Last-Modified': stats.mtime.toUTCString(),
      // Security headers
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    }

    // Add CORS headers for cross-origin requests
    headers['Access-Control-Allow-Origin'] = '*'
    headers['Access-Control-Allow-Methods'] = 'GET'
    headers['Access-Control-Allow-Headers'] = 'Content-Type'

    console.log('✅ File served successfully:', {
      filePath,
      size: stats.size,
      mimeType,
      userId: userId.substring(0, 8) + '...'
    })

    return new Response(new Uint8Array(fileBuffer), { headers })

  } catch (error) {
    console.error('💥 File serving error:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}