export declare const SNAPSHOT_VERSION: number
export declare const SNAPSHOT_ENDPOINTS: Record<'front' | 'countries' | 'status' | 'map' | 'social' | 'sectors' | 'suggestions' | 'mix', string>
export interface Snapshot {
  version: number
  generatedAt: string
  data: Partial<Record<keyof typeof SNAPSHOT_ENDPOINTS, unknown>>
}
type FetchLike = (input: URL, init?: RequestInit) => Promise<Response>
export declare function waitForApi(apiBase: string, options?: { fetchImpl?: FetchLike; totalMs?: number; stepMs?: number }): Promise<boolean>
export declare function collectSnapshot(apiBase: string, options?: { fetchImpl?: FetchLike; timeoutMs?: number; now?: () => Date }): Promise<Snapshot | null>
export declare function isSnapshot(value: unknown): value is Snapshot
