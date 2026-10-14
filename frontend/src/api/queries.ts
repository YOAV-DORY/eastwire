import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { ApiError, apiGet } from './client'
import type { ArticlePage, CountryView, PlaceView, SourceView, Status } from './types'

/**
 * Retry patiently: the free-tier API sleeps after 15 minutes and takes about a minute to
 * wake. Up to 6 retries with growing delays cover roughly 90 seconds. Client errors (4xx)
 * are not retried.
 */
export const retryPolicy = {
  retry: (failureCount: number, error: unknown) =>
    failureCount < 6 && (!(error instanceof ApiError) || error.retryable),
  retryDelay: (attempt: number) => Math.min(2_000 * 2 ** attempt, 20_000),
}

export interface FeedFilters {
  country?: string
  city?: string
}

export function useArticleFeed(filters: FeedFilters) {
  return useInfiniteQuery({
    queryKey: ['articles', filters],
    queryFn: ({ pageParam, signal }) =>
      apiGet<ArticlePage>('/api/v1/articles', { country: filters.country, city: filters.city, page: pageParam }, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    ...retryPolicy,
  })
}

export function useStatus() {
  return useQuery({
    queryKey: ['status'],
    queryFn: ({ signal }) => apiGet<Status>('/api/v1/status', {}, signal),
    refetchInterval: 5 * 60_000,
    ...retryPolicy,
  })
}

export function useCountries() {
  return useQuery({
    queryKey: ['countries'],
    queryFn: ({ signal }) => apiGet<CountryView[]>('/api/v1/countries', {}, signal),
    ...retryPolicy,
  })
}

export function usePlaces(country: string | undefined) {
  return useQuery({
    queryKey: ['places', country],
    queryFn: ({ signal }) => apiGet<PlaceView[]>('/api/v1/places', { country }, signal),
    enabled: Boolean(country),
    staleTime: 24 * 60 * 60_000,
    ...retryPolicy,
  })
}

export function useSources() {
  return useQuery({
    queryKey: ['sources'],
    queryFn: ({ signal }) => apiGet<SourceView[]>('/api/v1/sources', {}, signal),
    staleTime: 60 * 60_000,
    ...retryPolicy,
  })
}
