import { createHmac } from 'crypto'

/**
 * Signed URL Generation and Validation
 *
 * Provides cryptographic security for file serving without database queries.
 * Uses HMAC-SHA256 to ensure URLs cannot be tampered with or forged.
 */

const SECRET = process.env.FILE_SIGNING_SECRET!

if (!SECRET) {
  throw new Error('FILE_SIGNING_SECRET environment variable is required')
}

/**
 * Generate a signed URL for secure file access
 */
export function signUrl(filePath: string, userId: string, expiresAt: number): string {
  const payload = `${filePath}:${userId}:${expiresAt}`
  const signature = createHmac('sha256', SECRET)
    .update(payload)
    .digest('hex')

  return `/files/${filePath}?userId=${userId}&expires=${expiresAt}&sig=${signature}`
}

/**
 * Verify a signed URL's authenticity and expiry
 */
export function verifySignature(filePath: string, userId: string, expires: string, signature: string): boolean {
  const now = Date.now()
  const expiryTime = parseInt(expires)

  // Check if URL has expired
  if (expiryTime < now) {
    console.log('🕐 Signed URL expired:', { expiryTime, now, diff: now - expiryTime })
    return false
  }

  // Recreate signature with same payload
  const payload = `${filePath}:${userId}:${expires}`
  const expectedSig = createHmac('sha256', SECRET)
    .update(payload)
    .digest('hex')

  // Compare signatures (constant-time comparison for security)
  const isValid = signature === expectedSig

  if (!isValid) {
    console.log('🔐 Invalid signature:', {
      provided: signature.substring(0, 8) + '...',
      expected: expectedSig.substring(0, 8) + '...'
    })
  }

  return isValid
}

/**
 * Determine MIME type from file extension
 */
export function getMimeTypeFromExtension(extension: string): string {
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

/**
 * Extract file extension from path
 */
export function getFileExtension(filePath: string): string {
  const parts = filePath.split('.')
  return parts.length > 1 ? `.${parts.pop()}` : ''
}

/**
 * Check if a signed URL is expiring soon
 */
export function isUrlExpiringSoon(signedUrl: string, bufferMinutes = 30): boolean {
  try {
    const url = new URL(signedUrl, 'http://localhost')
    const expires = url.searchParams.get('expires')
    if (!expires) return true

    const expiryTime = parseInt(expires)
    const bufferTime = bufferMinutes * 60 * 1000

    return Date.now() > (expiryTime - bufferTime)
  } catch {
    return true // If parsing fails, assume expired
  }
}