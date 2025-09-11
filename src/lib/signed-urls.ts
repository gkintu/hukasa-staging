import { createHmac, timingSafeEqual } from 'node:crypto'

// Configuration
const DEFAULT_EXPIRY_HOURS = 1
const SIGNING_SECRET = process.env.FILE_SIGNING_SECRET
if (!SIGNING_SECRET) {
  throw new Error('FILE_SIGNING_SECRET environment variable is required')
}
// TypeScript assertion - we know it's defined after the check above
const SECRET: string = SIGNING_SECRET

// Type definitions
export interface SignedUrlParams {
  fileId: string
  expiresAt: number
  signature: string
}

export interface SignedUrlOptions {
  expiryHours?: number
}

// Generate a signed URL for temporary file access
export function generateSignedFileUrl(fileId: string, options: SignedUrlOptions = {}): string {
  const expiryHours = options.expiryHours || DEFAULT_EXPIRY_HOURS
  const expiresAt = Math.floor(Date.now() / 1000) + (expiryHours * 3600) // Unix timestamp
  
  // Create HMAC signature using fileId and expiry timestamp
  const payload = `${fileId}:${expiresAt}`
  const signature = createHmac('sha256', SECRET)
    .update(payload)
    .digest('hex')
  
  // Construct the signed URL
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_BASE_URL environment variable is required')
  }
  return `${baseUrl}/api/temp/files/${fileId}?expires=${expiresAt}&signature=${signature}`
}

// Verify a signed URL and extract parameters
export function verifySignedUrl(fileId: string, expires: string, signature: string): {
  valid: boolean
  expired?: boolean
  fileId?: string
} {
  // Check if required parameters are present
  if (!fileId || !expires || !signature) {
    return { valid: false }
  }
  
  // Parse expiry timestamp
  const expiresAt = parseInt(expires, 10)
  if (isNaN(expiresAt)) {
    return { valid: false }
  }
  
  // Check if URL has expired
  const now = Math.floor(Date.now() / 1000)
  if (now > expiresAt) {
    return { valid: false, expired: true }
  }
  
  // Recreate the expected signature
  const payload = `${fileId}:${expiresAt}`
  const expectedSignature = createHmac('sha256', SECRET)
    .update(payload)
    .digest('hex')
  
  // Constant-time comparison to prevent timing attacks
  const signatureBuffer = Buffer.from(signature, 'hex')
  const expectedBuffer = Buffer.from(expectedSignature, 'hex')
  
  if (signatureBuffer.length !== expectedBuffer.length) {
    return { valid: false }
  }
  
  // Use crypto.timingSafeEqual for constant-time comparison
  const isValidSignature = timingSafeEqual(signatureBuffer, expectedBuffer)
  
  return {
    valid: isValidSignature,
    fileId: isValidSignature ? fileId : undefined
  }
}

// Extract file ID from a signed URL path
export function extractFileId(pathname: string): string | null {
  const match = pathname.match(/\/api\/temp\/files\/([^/?]+)/)
  return match ? match[1] : null
}

// Utility to check if a URL is expired (for logging/debugging)
export function isUrlExpired(expires: string): boolean {
  const expiresAt = parseInt(expires, 10)
  if (isNaN(expiresAt)) return true
  
  const now = Math.floor(Date.now() / 1000)
  return now > expiresAt
}

// Generate multiple signed URLs (for batch operations)
export function generateBatchSignedUrls(
  fileIds: string[], 
  options: SignedUrlOptions = {}
): Record<string, string> {
  return fileIds.reduce((urls, fileId) => {
    urls[fileId] = generateSignedFileUrl(fileId, options)
    return urls
  }, {} as Record<string, string>)
}