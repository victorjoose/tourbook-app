import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { updateTourDate, type TourDatePatch, type TourWithDates } from '@tour/core'
import { queryKeys } from '../../../app/queryClient'
import { client } from '../../../lib/firebase'
import { applyDatePatch } from './helpers'

export type DatePatchInput = { dateId: string; patch: TourDatePatch }

type OptimisticContext = { previous: TourWithDates | null | undefined }

/** Invalidates the tour and the tours list (both carry the date summary). */
export async function invalidateTour(queryClient: QueryClient, tourId: string): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.tour(tourId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.tours }),
  ])
}

/**
 * `updateTourDate` with an optimistic cache update (`setQueryData`), reverted on
 * error, followed by invalidation so the server state wins.
 */
export function useUpdateTourDate(tourId: string) {
  const queryClient = useQueryClient()
  const key = queryKeys.tour(tourId)
  return useMutation<void, Error, DatePatchInput, OptimisticContext>({
    mutationFn: ({ dateId, patch }) => updateTourDate(client, tourId, dateId, patch),
    onMutate: async ({ dateId, patch }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<TourWithDates | null>(key)
      queryClient.setQueryData<TourWithDates | null>(key, (old) => (old ? applyDatePatch(old, dateId, patch) : old))
      return { previous }
    },
    onError: (_error, _input, context) => {
      if (context && context.previous !== undefined) queryClient.setQueryData(key, context.previous)
    },
    onSettled: () => invalidateTour(queryClient, tourId),
  })
}
