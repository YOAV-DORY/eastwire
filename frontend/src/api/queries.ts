import { keepPreviousData, useInfiniteQuery, useQuery, type QueryClient, type QueryKey } from '@tanstack/react-query'
import { readSaved, writeSaved } from '../lib/savedCopy'
import { ApiError, apiGet, FIRST_ATTEMPT_TIMEOUT_MS, TIMEOUT_MS, type Params } from './client'
import type {
  ArticlePage,
  CountryView,
  FrontPage,
  LocationRole,
  MapData,
  MapWindow,
  Mix,
  PlaceView,
  SectorsView,
  SocialPage,
  SocialPlatform,
  SourceView,
  Status,
} from './types'

/**
 * Bounded retries: the free-tier API sleeps after 15 minutes and takes about a minute to wake.
 * The first attempt waits 30 s, then up to three retries (2, 5 and 10 s apart, 15 s each), so a
 * request gives up within about 90 seconds and the page shows an error with a retry button.
 * Client errors (4xx) are not retried.
 */
export const retryPolicy = {
  retry: (failureCount: number, error: unknown) =>
    failureCount < 3 && (!(error instanceof ApiError) || error.retryable),
  retryDelay: (attempt: number) => [2_000, 5_000, 10_000][attempt] ?? 10_000,
}

/** What a query function receives that these helpers use. */
interface Ctx {
  client: QueryClient
  queryKey: QueryKey
  signal: AbortSignal
}

/** A GET whose first attempt allows for a cold start and whose retries are quicker. */
function get<T>(path: string, params: Params, ctx: Ctx): Promise<T> {
  const failures = ctx.client.getQueryState(ctx.queryKey)?.fetchFailureCount ?? 0
  return apiGet<T>(path, params, ctx.signal, failures === 0 ? FIRST_ATTEMPT_TIMEOUT_MS : TIMEOUT_MS)
}

/**
 * Starts from the copy saved on this device (if any, with its real time) and saves each fresh
 * result. TanStack treats the saved copy as stale, so it refreshes in the background at once.
 */
function savedCopy<T>(key: QueryKey) {
  const saved = readSaved<T>(key)
  return saved ? { initialData: saved.data, initialDataUpdatedAt: saved.savedAt } : {}
}

async function getAndSave<T>(path: string, params: Params, ctx: Ctx): Promise<T> {
  const data = await get<T>(path, params, ctx)
  writeSaved(ctx.queryKey, data)
  return data
}

export interface FrontFilters {
  country?: string
  city?: string
  sector?: string
}

/** The ranked front page (lead, secondaries, Latest, Reading), optionally for a country, city or sector. */
export function useFront(filters: FrontFilters) {
  const queryKey = ['front', filters] as const
  return useQuery({
    queryKey,
    queryFn: (ctx) => getAndSave<FrontPage>('/api/v1/front', { ...filters }, ctx),
    ...savedCopy<FrontPage>(queryKey),
    staleTime: 0,
    // If the live request gave up while a snapshot is on screen, try again quietly each minute.
    refetchInterval: (query) => (query.state.status === 'error' ? 60_000 : false),
    ...retryPolicy,
  })
}

export interface FeedFilters {
  country?: string
  city?: string
  sector?: string
  /** Earliest publication date, YYYY-MM-DD. */
  from?: string
}

export function useArticleFeed(filters: FeedFilters) {
  return useInfiniteQuery({
    queryKey: ['articles', filters],
    queryFn: (ctx) =>
      get<ArticlePage>(
        '/api/v1/articles',
        { country: filters.country, city: filters.city, sector: filters.sector, from: filters.from, page: ctx.pageParam as number },
        ctx,
      ),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    ...retryPolicy,
  })
}

export function useStatus() {
  const queryKey = ['status'] as const
  return useQuery({
    queryKey,
    queryFn: (ctx) => getAndSave<Status>('/api/v1/status', {}, ctx),
    ...savedCopy<Status>(queryKey),
    staleTime: 0,
    // Gentle: every 5 minutes, and only while the page is visible (TanStack's default).
    refetchInterval: 5 * 60_000,
    ...retryPolicy,
  })
}

export function useCountries() {
  const queryKey = ['countries'] as const
  return useQuery({
    queryKey,
    queryFn: (ctx) => getAndSave<CountryView[]>('/api/v1/countries', {}, ctx),
    ...savedCopy<CountryView[]>(queryKey),
    staleTime: 0,
    ...retryPolicy,
  })
}

export function usePlaces(country: string | undefined) {
  return useQuery({
    queryKey: ['places', country],
    queryFn: (ctx) => get<PlaceView[]>('/api/v1/places', { country }, ctx),
    enabled: Boolean(country),
    staleTime: 24 * 60 * 60_000,
    ...retryPolicy,
  })
}

/** Today's mix for the Sources page: stories of the last 24 hours by country and by publisher. */
export function useMix() {
  return useQuery({
    queryKey: ['mix'],
    queryFn: (ctx) => get<Mix>('/api/v1/mix', {}, ctx),
    staleTime: 5 * 60_000,
    ...retryPolicy,
  })
}

export function useSources() {
  return useQuery({
    queryKey: ['sources'],
    queryFn: (ctx) => get<SourceView[]>('/api/v1/sources', {}, ctx),
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
    queryFn: (ctx) => get<ArticlePage>('/api/v1/search', { ...filters }, ctx),
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
    queryFn: (ctx) =>
      get<MapData>(
        '/api/v1/map/cities',
        { window: filters.window, roles: filters.roles.join(','), country: filters.country, sector: filters.sector },
        ctx,
      ),
    placeholderData: keepPreviousData,
    ...retryPolicy,
  })
}

/** The whole city list (with populations) for the optional population layer. */
export function useAllPlaces(enabled: boolean) {
  return useQuery({
    queryKey: ['places', 'all'],
    queryFn: (ctx) => get<PlaceView[]>('/api/v1/places', {}, ctx),
    enabled,
    staleTime: 24 * 60 * 60_000,
    ...retryPolicy,
  })
}

/** The sector rules (config/sectors.yaml) and how many recent stories carry each tag. */
export function useSectors() {
  return useQuery({
    queryKey: ['sectors'],
    queryFn: (ctx) => get<SectorsView>('/api/v1/sectors', {}, ctx),
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
    queryFn: (ctx) =>
      get<SocialPage>(
        '/api/v1/social',
        { platform: filters.platform, country: filters.country, size: filters.size, page: ctx.pageParam as number },
        ctx,
      ),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    ...retryPolicy,
  })
}

/** Example searches that return results right now (the API counts them against live stories). */
export function useSearchSuggestions() {
  return useQuery({
    queryKey: ['search-suggestions'],
    queryFn: (ctx) => get<{ q: string; count: number }[]>('/api/v1/search/suggestions', {}, ctx),
    staleTime: 10 * 60_000,
    ...retryPolicy,
  })
}
