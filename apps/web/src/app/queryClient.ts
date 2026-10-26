import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

/** Chaves de cache compartilhadas entre as features. */
export const queryKeys = {
  profile: (userId: string) => ['profile', userId] as const,
  region: ['region'] as const,
  cities: ['cities'] as const,
  tours: ['tours'] as const,
  tour: (id: string) => ['tour', id] as const,
  mySubmissions: (userId: string) => ['submissions', userId] as const,
  pendingVenues: ['pending-venues'] as const,
  publicTourbook: (token: string) => ['public-tourbook', token] as const,
}
