'use client'

import { useAuthSSE } from './hooks/use-auth-sse'

interface AuthSSEProviderProps {
  children: React.ReactNode
}

export function AuthSSEProvider({ children }: AuthSSEProviderProps) {
  // Initialize SSE connection for authenticated users
  useAuthSSE()

  return <>{children}</>
}