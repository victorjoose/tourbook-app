import { useQuery } from '@tanstack/react-query'
import { fetchRegionData, type RegionData } from '@tour/core'
import { useMemo } from 'react'
import { queryKeys } from '../app/queryClient'
import { supabase } from '../lib/supabase'

/** Cidades, casas, produtoras e bandas da região-piloto (cache de 5 min). */
export function useRegionData() {
  return useQuery({
    queryKey: queryKeys.region,
    queryFn: () => fetchRegionData(supabase),
    staleTime: 5 * 60_000,
  })
}

/** Índices por id para lookups O(1) nas telas. */
export function useRegionIndex(data: RegionData | undefined) {
  return useMemo(() => {
    const cities = new Map((data?.cities ?? []).map((c) => [c.id, c]))
    const venues = new Map((data?.venues ?? []).map((v) => [v.id, v]))
    const producers = new Map((data?.producers ?? []).map((p) => [p.id, p]))
    const bands = new Map((data?.bands ?? []).map((b) => [b.id, b]))
    return { cities, venues, producers, bands }
  }, [data])
}
