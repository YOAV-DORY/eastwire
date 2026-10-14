import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { ApiError, apiGet } from './client'
import type {
  ArticlePage,
  CountryView,
  LocationRole,
  MapData,
  MapWindow,
  PlaceView,
  SectorsView,
  SocialPage,
  SocialPlatform,
  SourceView,
  Status,
} from './types'

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
  sector?: string
}

export function useArticleFeed(filters: FeedFilters) {
  return useInfiniteQuery({
    queryKey: ['articles', filters],
    queryFn: ({ pageParam, signal }) =>
      apiGet<ArticlePage>(
        '/api/v1/articles',
        { country: filters.country, city: filters.city, sector: filters.sector, page: pageParam },
        signal,
      ),
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

export interface SearchFilters {
  q: string
  country?: string
  city?: string
  sector?: string
  from?: string
  to?: string
  sort?: 'relevance' | 'date'
  page: number
}

/** Full-text search; the previous page stays visible while the next one loads. */
export function useSearch(filters: SearchFilters) {
  return useQuery({
    queryKey: ['search', filters],
    queryFn: ({ signal }) => apiGet<ArticlePage>('/api/v1/search', { ...filters }, signal),
    enabled: filters.q.trim().length >= 2,
    placeholderData: keepPreviousData,
    ...retryPolicy,
  })
}

export interface MapFilters {
  window: MapWindow
  roles: LocationRole[]
  country?: string
  sector?: string
}

export function useMapCities(filters: MapFilters) {
  return useQuery({
    queryKey: ['map', filters],
    queryFn: ({ signal }) =>
      apiGet<MapData>(
        '/api/v1/map/cities',
        { window: filters.window, roles: filters.roles.join(','), country: filters.country, sector: filters.sector },
        signal,
      ),
    placeholderData: keepPreviousData,
    ...retryPolicy,
  })
}

/** The whole city list (with populations) for the optional population layer. */
export function useAllPlaces(enabled: boolean) {
  return useQuery({
    queryKey: ['places', 'all'],
    queryFn: ({ signal }) => apiGet<PlaceView[]>('/api/v1/places', {}, signal),
    enabled,
    staleTime: 24 * 60 * 60_000,
    ...retryPolicy,
  })
}

/** The sector rules (config/sectors.yaml) and how many recent stories carry each tag. */
export function useSectors() {
  return useQuery({
    queryKey: ['sectors'],
    queryFn: ({ signal }) => apiGet<SectorsView>('/api/v1/sectors', {}, signal),
    staleTime: 5 * 60_000,
    ...retryPolicy,
  })
}

export interface SocialFilters {
  platform?: SocialPlatform
  country?: string
  size?: number
}

/** Curated social posts and videos, newest first. */
export function useSocial(filters: SocialFilters) {
  return useInfiniteQuery({
    queryKey: ['social', filters],
    queryFn: ({ pageParam, signal }) =>
      apiGet<SocialPage>(
        '/api/v1/social',
        { platform: filters.platform, country: filters.country, size: filters.size, page: pageParam },
        signal,
      ),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    ...retryPolicy,
  })
}
