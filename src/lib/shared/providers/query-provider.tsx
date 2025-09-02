'use client'

import {
  isServer,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

// Same QueryClient configuration as admin (extracted pattern)
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute default
        refetchOnWindowFocus: true, // Refetch when user returns to tab
        refetchOnMount: true, // Refetch when component mounts
        refetchOnReconnect: true, // Refetch on network reconnect
        // Enable background refetching for real-time updates
        refetchInterval: false, // Disabled by default, can be overridden per query
        retry: 1, // Reduce retries for faster feedback
      },
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          query.state.status === 'pending' || query.state.status === 'success',
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined = undefined

function getQueryClient() {
  if (isServer) {
    return makeQueryClient()
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient()
    return browserQueryClient
  }
}

interface SharedQueryProviderProps {
  children: React.ReactNode
}

export function SharedQueryProvider({ children }: SharedQueryProviderProps) {
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}